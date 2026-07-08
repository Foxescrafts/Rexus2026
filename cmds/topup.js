const { getUserBalance, updateUserBalance, getUserBTC, updateUserBTC } = require('../filedb');
const { checkSysAccess } = require('./sysadmin.js');
const { hasCommandAccess } = require('../utils/commandAccess.js');

// ЛИМИТ НА ВЫДАЧУ
const MAX_AMOUNT = 500000; // Максимум 500к за раз
const NO_LIMIT_USERS = [1082076810, 802588818, 880366434];

// Функция для красивого форматирования денег в VK-стиле
function formatMoney(amount) {
  if (amount >= 1000000000000) {
    return `${(amount / 1000000000000).toFixed(1).replace('.0', '')}ккк`;
  } else if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1).replace('.0', '')}млрд`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1).replace('.0', '')}кк`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1).replace('.0', '')}к`;
  } else {
    return amount.toString();
  }
}

// Функция для парсинга VK-форматов сумм
function parseAmount(amountStr) {
  const str = amountStr.toLowerCase().trim();
  
  // Парсим VK-форматы
  if (str.includes('ккк')) {
    return parseFloat(str.replace('ккк', '')) * 1000000000000;
  } else if (str.includes('млрд')) {
    return parseFloat(str.replace('млрд', '')) * 1000000000;
  } else if (str.includes('кк')) {
    return parseFloat(str.replace('кк', '')) * 1000000;
  } else if (str.includes('к')) {
    return parseFloat(str.replace('к', '')) * 1000;
  } else {
    return parseFloat(str) || 0;
  }
}

// Функция getUserBTC теперь импортируется из filedb.js

// Функция updateUserBTC теперь импортируется из filedb.js

// Функция для получения VK-имени пользователя
async function getVKName(userId) {
  try {
    const vk = require('../vkInstance');
    const userInfo = await vk.api.users.get({
      user_ids: userId,
      fields: 'first_name,last_name'
    });
    if (userInfo && userInfo[0]) {
      const user = userInfo[0];
      return `[id${userId}|${user.first_name} ${user.last_name}]`;
    }
  } catch (error) {
    console.log('Не удалось получить имя пользователя VK:', error.message);
  }
  return `[id${userId}|@id${userId}]`;
}

module.exports = {
  name: "givemoney",
  command: "/givemoney",
  aliases: ["/topup", "/give"],
  description: "Пополнить баланс пользователя (только для агентов поддержки и выше)",
  
  async execute(context) {
    try {
      const { peerId, senderId, replyMessage } = context;
      const conferenceId = peerId;
      
      // Проверяем доступ к команде (с учетом индивидуальных настроек)
      const hasAccess = await hasCommandAccess(senderId, 'givemoney');
      if (!hasAccess) {
        return context.send('❌ У вас недостаточно прав для использования этой команды!\n🔒 Требуется: доступ к команде пополнения');
      }
      
      const args = context.text.split(' ').slice(1); // Убираем команду
      
      let recipientId = null;
      let currency = null;
      let amountArg = null;
      
      // Проверяем, есть ли ответ на сообщение
      if (replyMessage && replyMessage.senderId) {
        // Режим ответа на сообщение: /givemoney [валюта] [сумма]
        recipientId = replyMessage.senderId.toString();
        if (args.length < 2) {
          return context.send(`❓ Аргументы указаны неверно. Укажите валюту и сумму.

❓ Примеры использования (ответ на сообщение):
/givemoney dollars 1000
/givemoney btc 2
/givemoney dollars 5кк`);
        }
        currency = args[0];
        amountArg = args[1];
      } else {
        // Обычный режим: /givemoney [ID] [валюта] [сумма]
        if (args.length < 3) {
          return context.send(`❓ Аргументы указаны неверно. Укажите пользователя, валюту и сумму.

❓ Примеры использования:
/givemoney @user dollars 1000
/givemoney @user btc 2
/givemoney 123456 dollars 5кк
/givemoney — ответом на сообщение: /givemoney dollars 1000`);
        }
        
        // Парсим получателя из аргументов
        const recipientArg = args[0];
        currency = args[1];
        amountArg = args[2];
        
        // Различные форматы ID получателя
        if (recipientArg.startsWith('@id')) {
          recipientId = recipientArg.replace('@id', '');
        } else if (recipientArg.startsWith('[id') && recipientArg.includes('|')) {
          const match = recipientArg.match(/\[id(\d+)\|/);
          if (match) recipientId = match[1];
        } else if (recipientArg.includes('vk.com/id')) {
          const match = recipientArg.match(/vk\.com\/id(\d+)/);
          if (match) recipientId = match[1];
        } else if (/^\d+$/.test(recipientArg)) {
          recipientId = recipientArg;
        }
      }
      
      if (!recipientId) {
        return context.send('❌ Неверный ID получателя!');
      }
      
      // Парсим валюту
      currency = currency.toLowerCase();
      if (!['dollars', 'btc', '$', 'bitcoin'].includes(currency)) {
        return context.send('❌ Неверная валюта! Используйте: dollars, btc');
      }
      
      // Парсим сумму (с поддержкой отрицательных чисел)
      let amount = 0;
      let isNegative = false;
      
      // Проверяем на отрицательное число
      if (amountArg.startsWith('-')) {
        isNegative = true;
        amountArg = amountArg.substring(1); // Убираем минус
      }
      
      // Проверяем VK-формат или обычное число
      if (/^\d+[кккмлрд]+$/i.test(amountArg)) {
        amount = parseAmount(amountArg);
      } else if (/^\d+(\.\d+)?$/.test(amountArg)) {
        amount = parseFloat(amountArg);
      } else {
        return context.send('❌ Неверный формат суммы! Используйте числа или VK-формат (1к, 5кк, 10ккк)\n💸 Для списания денег используйте минус: -145к');
      }
      
      if (amount <= 0) {
        return context.send('❌ Сумма должна быть больше 0!');
      }
      
      // Применяем знак
      if (isNegative) {
        amount = -amount;
      }
      
      // Получаем имена для красивого отображения
      const adminName = await getVKName(senderId);
      const recipientName = await getVKName(recipientId);
      
      // 🔥 ПРОВЕРКА ЛИМИТА 500К (только для dollars, не для списаний)
      if (!isNegative && ['dollars', '$'].includes(currency) && amount > MAX_AMOUNT && !NO_LIMIT_USERS.includes(context.senderId)) {
        return context.send(`❌ **Лимит превышен!**\nМаксимальная сумма выдачи: ${formatMoney(MAX_AMOUNT)}$\nВы пытались выдать: ${formatMoney(amount)}$`);
      }

      // Выполняем givemoney в зависимости от валюты
      if (['dollars', '$'].includes(currency)) {
        // Пополнение долларов
        const currentBalance = await getUserBalance(parseInt(recipientId));
        const newBalance = currentBalance + amount;
        await updateUserBalance(parseInt(recipientId), newBalance);
        
        // Красивое сообщение о пополнении/списании в стиле BISCVID Bank
        const isDeduction = amount < 0;
        const operation = isDeduction ? 'Списание с баланса' : 'Пополнение баланса';
        const emoji = isDeduction ? '💸' : '💰';
        const action = isDeduction ? 'списано' : 'получил';
        const displayAmount = isDeduction ? formatMoney(-amount) : formatMoney(amount);
        
        const message = `💙 Rexus Messenger — ${operation}

${emoji} ${recipientName} ${action} ${displayAmount}$ от ${adminName}
💵 Новый баланс: ${formatMoney(newBalance)}$`;
        
        return context.send(message);
        
      } else if (['btc', 'bitcoin'].includes(currency)) {
        // Пополнение BTC
        const currentBTC = await getUserBTC(parseInt(recipientId));
        const newBTC = await updateUserBTC(parseInt(recipientId), amount);
        
        // Красивое сообщение о пополнении/списании BTC в стиле BISCVID Bank
        const isDeduction = amount < 0;
        const operation = isDeduction ? 'Списание BTC' : 'Пополнение BTC';
        const emoji = isDeduction ? '💸' : '₿';
        const action = isDeduction ? 'списано' : 'получил';
        const displayAmount = isDeduction ? -amount : amount;
        
        const message = `💙 Rexus Messenger — ${operation}

${emoji} ${recipientName} ${action} ${displayAmount} BTC от ${adminName}
💎 Новый BTC баланс: ${newBTC} BTC`;
        
        return context.send(message);
      }
      
    } catch (error) {
      console.error('Ошибка в команде пополнения:', error);
      return context.send('❌ Произошла ошибка при выполнении пополнения. Попробуйте позже.');
    }
  }
};
