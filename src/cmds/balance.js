const { databaseQuery } = require('../databases');
const { getUserBalance, updateUserBalance, getUserBTC, updateUserBTC, getUserResources } = require('../filedb.js');

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

// Функция для парсинга суммы в разных форматах
function parseAmount(amountStr) {
  const str = amountStr.toLowerCase().trim();
  
  // Проверяем BTC
  if (str.includes('btc')) {
    const btcAmount = parseFloat(str.replace('btc', ''));
    return {
      amount: btcAmount * 230000, // 1 BTC = 230k
      isBTC: true,
      btcAmount: btcAmount,
      originalStr: amountStr
    };
  }
  
  // Парсим VK-форматы
  if (str.includes('ккк')) {
    return {
      amount: parseFloat(str.replace('ккк', '')) * 1000000000000,
      isBTC: false,
      originalStr: amountStr
    };
  } else if (str.includes('млрд')) {
    return {
      amount: parseFloat(str.replace('млрд', '')) * 1000000000,
      isBTC: false,
      originalStr: amountStr
    };
  } else if (str.includes('кк')) {
    return {
      amount: parseFloat(str.replace('кк', '')) * 1000000,
      isBTC: false,
      originalStr: amountStr
    };
  } else if (str.includes('к')) {
    return {
      amount: parseFloat(str.replace('к', '')) * 1000,
      isBTC: false,
      originalStr: amountStr
    };
  } else {
    return {
      amount: parseFloat(str),
      isBTC: false,
      originalStr: amountStr
    };
  }
}







module.exports = {
  command: '/баланс',
  description: 'Показать ваш игровой баланс',
  aliases: ['/balance', '/bal'],
  
  async execute(context) {
    try {
      const userId = context.senderId;
      
      // Используем filedb.js для совместимости с рулеткой
      const balance = await getUserBalance(userId);
      const btcBalance = await getUserBTC(userId);
      
      // Получаем информацию о пользователе для красивого отображения
      let userName = `[id${userId}|@id${userId}]`;
      try {
        const vk = require('../vkInstance');
        const userInfo = await vk.api.users.get({
          user_ids: userId,
          fields: 'first_name,last_name'
        });
        if (userInfo && userInfo[0]) {
          userName = `[id${userId}|${userInfo[0].first_name} ${userInfo[0].last_name}]`;
        }
      } catch (error) {
        console.log('Не удалось получить имя пользователя');
      }
      
      // Красивое оформление баланса
      // Получаем ресурсы пользователя
      const resources = await getUserResources(userId);
      
      let message = `💙 Rexus Messenger — Баланс

👤 ${userName}

На ваших счетах:
💵 Долларов: ${balance.toLocaleString()}$
₿ Биткойнов: ${btcBalance} BTC`;
      
      // Добавляем информацию о ресурсах, если они есть
      const resourceNames = {
        stone: '🪨 Камень',
        coal: '⚫ Уголь', 
        iron: '🔩 Железо',
        gold: '🟡 Золото',
        diamond: '💎 Алмаз'
      };
      
      let hasResources = false;
      let resourcesText = '';
      
      for (const [type, amount] of Object.entries(resources)) {
        if (amount > 0) {
          if (!hasResources) {
            resourcesText += '\n\n⛏️ Ресурсы:';
            hasResources = true;
          }
          resourcesText += `\n${resourceNames[type]}: ${amount} шт.`;
        }
      }
      
      message += resourcesText;
      
      return context.send(message);
      
    } catch (error) {
      console.error('Ошибка в команде баланс:', error);
      return context.send('❌ Произошла ошибка при получении баланса');
    }
  },
  
  // Экспортируем функции для использования в других командах
  getUserBalance,
  updateUserBalance,
  getUserBTC,
  updateUserBTC,
  formatMoney,
  parseAmount
};
