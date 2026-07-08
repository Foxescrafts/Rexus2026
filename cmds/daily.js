const { getUserBalance, updateUserBalance, getLastDaily, setLastDaily, getUserVipStatus } = require('../filedb');
const { getlink } = require('../util.js');
// Используем глобальный Set из index.js для единой блокировки
const processingBonuses = global.processingBonuses || new Set();

// Функция для красивого форматирования денег в VK-стиле
function formatMoney(amount) {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1).replace('.0', '')}млрд`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1).replace('.0', '')}кк`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1).replace('.0', '')}к`;
  } else {
    return amount.toString();
  }
}

function getRandomBonus(userId) {
  // Случайное число от 10 000 до 560 000
  let vipMultiplier = 1;
  try {
    const fs = require("fs");
    const path = require("path");
    const vf = path.join(__dirname, "..", "data", "vip_users", userId + ".json");
    if (fs.existsSync(vf)) {
      const v = JSON.parse(fs.readFileSync(vf, "utf8"));
      if (v.vip_type) vipMultiplier = 1 + v.vip_type * 0.5;
    }
  } catch(e) {}
  return Math.floor((Math.floor(Math.random() * (560000 - 10000 + 1)) + 10000) * vipMultiplier);
}

async function handleDaily(userId, peerId, bonusReminder) {
  try {
    const lastDaily = await getLastDaily(userId);
    const now = new Date();
    
    if (lastDaily) {
      const lastDailyDate = new Date(lastDaily.last_daily);
      if (now.getTime() - lastDailyDate.getTime() < 24 * 60 * 60 * 1000) {
        const nextDaily = new Date(lastDailyDate.getTime() + 24 * 60 * 60 * 1000);
        const hours = Math.floor((nextDaily - now) / (60 * 60 * 1000));
        const minutes = Math.floor(((nextDaily - now) % (60 * 60 * 1000)) / (60 * 1000));
        return {
          success: false,
          message: `❌ @id${userId}(Вы) уже получили бонус сегодня!\n⏰ Следующий бонус будет доступен через ${hours}ч ${minutes}м`
        };
      }
      
      // streak
      const daysDiff = Math.floor((now - lastDailyDate) / (24 * 60 * 60 * 1000));
      const streak = daysDiff === 1 ? lastDaily.streak + 1 : 1;
      
      // Новый бонус
      const bonus = getRandomBonus(userId);
      
      // Проверяем VIP статус для дополнительного бонуса
      const vipStatus = await getUserVipStatus(userId);
      let vipBonus = 0;
      let vipMessage = '';
      
      if (vipStatus && vipStatus.isVip) {
        vipBonus = Math.floor(bonus * 0.5); // 50% от основного бонуса
        vipMessage = `\n👑 У вас есть VIP статус! Дополнительный бонус: ${formatMoney(vipBonus)}$`;
      }
      
      const totalBonus = bonus + vipBonus;
      
      // Обновляем баланс
      const currentBalance = await getUserBalance(userId);
      const newBalance = currentBalance + totalBonus;
      await updateUserBalance(userId, newBalance);
      
      // Обновляем время последнего бонуса
      await setLastDaily(userId, streak);
      
      // Планируем напоминание через 24 часа, если менеджер передан
      if (bonusReminder) {
        bonusReminder.scheduleReminder(userId, peerId);
      }
      
      // Рассчитываем следующий бонус (увеличивается с каждым днем стрика)
      const nextBonus = Math.min(10000 + (streak * 5000), 100000); // Максимум 100к
      
      // Получаем кликабельную ссылку на пользователя
      const userLink = await getlink(userId);
      
      return {
        success: true,
        message: `🎁 ${userLink} получил ежедневный бонус — ${formatMoney(bonus)}$.${vipMessage}
🔥 Серия: ${streak} ${streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней'} подряд! Следующий бонус — ${formatMoney(nextBonus)}$ из ${formatMoney(100000)}$.`
      };
    } else {
      // Первый бонус пользователя
      const bonus = getRandomBonus(userId);
      
      // Проверяем VIP статус для дополнительного бонуса
      const vipStatus = await getUserVipStatus(userId);
      let vipBonus = 0;
      let vipMessage = '';
      
      if (vipStatus && vipStatus.isVip) {
        vipBonus = Math.floor(bonus * 0.5); // 50% от основного бонуса
        vipMessage = `\n👑 У вас есть VIP статус! Дополнительный бонус: ${formatMoney(vipBonus)}$`;
      }
      
      const totalBonus = bonus + vipBonus;
      const currentBalance = await getUserBalance(userId);
      const newBalance = currentBalance + totalBonus;
      
      await updateUserBalance(userId, newBalance);
      await setLastDaily(userId, 1);
      
      // Планируем напоминание через 24 часа, если менеджер передан
      if (bonusReminder) {
        bonusReminder.scheduleReminder(userId, peerId);
      }
      
      // Следующий бонус для первого дня
      const nextBonus = 15000; // 15к для второго дня
      
      // Получаем кликабельную ссылку на пользователя
      const userLink = await getlink(userId);
      
      return {
        success: true,
        message: `🎁 ${userLink} получил ежедневный бонус — ${formatMoney(bonus)}$.${vipMessage}
🔥 Серия: 1 день подряд! Следующий бонус — ${formatMoney(nextBonus)}$ из ${formatMoney(100000)}$.`
      };
    }
  } catch (error) {
    console.error('Ошибка при получении бонуса:', error);
    return {
      success: false,
      message: '❌ Произошла ошибка при получении бонуса'
    };
  }
}

module.exports = {
  name: "бонус",
  command: "/бонус",
  aliases: ["/daily", "/ежедневка", "/bonus"],
  async handler(ctx) {
    const userId = ctx.senderId || ctx.user_id || ctx.from_id;
    const peerId = ctx.peerId;
    
    // Получаем менеджер напоминаний из глобального объекта vk
    const bonusReminder = global.vk?.bonusReminder;
    
    const lockKey = `${userId}`; // пер-пользовательская блокировка, совпадает с index.js
    if (processingBonuses.has(lockKey)) {
      return ctx.send('⏳ Запрос обрабатывается...');
    }
    processingBonuses.add(lockKey);
    try {
      const result = await handleDaily(userId, peerId, bonusReminder);
      await ctx.send(result.message);
    } finally {
      setTimeout(() => processingBonuses.delete(lockKey), 1500);
    }
  },
  async execute(ctx) {
    await this.handler(ctx);
  },
  // Экспортируем функцию для использования в обработчике кнопки
  handleDaily
};
