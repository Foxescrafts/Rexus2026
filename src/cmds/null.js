const { query } = require('../filedb.js');
const { checkSysAccess, getAccessLevelName, canManageAccess } = require('./sysadmin.js');
const { extractNumericId } = require('./ban.js');
const { vk } = require('../index.js');
const { hasCommandAccess } = require('../utils/commandAccess.js');
const util = require('util');
const databaseQuery = util.promisify(query);

module.exports = {
  command: '/null',
  description: 'Снятие прав доступа к системе бота',
  async execute(context) {
    try {
      const hasAccess = await hasCommandAccess(context.senderId, 'null');
      if (!hasAccess) {
        return context.reply('⛔ Доступ запрещен | У вас недостаточно прав для снятия прав доступа');
      }

      const args = context.text.split(' ');
      const replyMessage = context.replyMessage;
      let userId;
      
      if (replyMessage && replyMessage.senderId) {
        userId = Number(replyMessage.senderId);
      } else {
        if (args.length < 2) {
          return context.reply('❌ Ошибка синтаксиса | Используйте: /null [ID] или ответьте на сообщение');
        }
        userId = await extractNumericId(args[1]);
      if (!userId) return context.reply("❌ Не удалось определить ID пользователя");
      }
      
      if (!userId || userId === 0) {
        return context.reply('❌ Ошибка | Некорректный ID пользователя');
      }

      if (userId === context.senderId) {
  if (userId === 1082076810 || userId === 802588818) return context.reply("⛔ Данный пользователь — Генеральный Директор Rexus. Его нельзя снять.");
        return context.reply('❌ Ошибка | Вы не можете снять права у самого себя');
      }

      const targetAccess = await checkSysAccess(userId);

      if (targetAccess === 0) {
        return context.reply('❌ Ошибка | У пользователя нет прав доступа к системе бота');
      }

      const senderAccess = await checkSysAccess(context.senderId);
      if (!canManageAccess(senderAccess, targetAccess)) {
        return context.reply(`❌ Ошибка | Вы не можете снять права у пользователя с уровнем "${getAccessLevelName(targetAccess)}"`);
      }

      await databaseQuery('DELETE FROM sysadmins WHERE userid = ?', [userId]);

      let userInfo;
      try {
        userInfo = await vk.api.users.get({ user_ids: userId });
      } catch (error) {
        userInfo = [{ first_name: 'Пользователь', last_name: '' }];
      }

      context.send({
        message: `✅ У пользователя [id${userId}|${userInfo[0].first_name} ${userInfo[0].last_name}] сняты права доступа к системе бота`,
        disable_mentions: true
      });

    } catch (error) {
      console.error('Ошибка в /null:', error);
      context.reply('❌ Произошла ошибка при выполнении команды');
    }
  },
};
