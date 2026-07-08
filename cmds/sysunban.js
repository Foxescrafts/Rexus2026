const database = require('../databases.js');
const { checkSysAccess, getAccessLevelName, isSysBanned } = require('./sysadmin.js');
const { hasCommandAccess, getAccessDeniedMessage } = require('../utils/commandAccess.js');
const { extractNumericId } = require('./ban.js');
const vk = require('../vkInstance.js');
const util = require('util');
const databaseQuery = util.promisify(database.query);

module.exports = {
  command: '/sysunban',
  description: 'Разблокировка пользователя в системе бота',
  async execute(context) {
    try {
      const hasAccess = await hasCommandAccess(context.userId || context.senderId, 'sysunban');
      if (!hasAccess) return context.send({ message: getAccessDeniedMessage('sysunban') });

      const senderAccess = await checkSysAccess(context.userId || context.senderId);
      const args = context.text.split(' ');

      let userId = context.replyMessage?.senderId;
      if (!userId) {
        if (args.length < 2) return context.send({ message: '❌ /sysunban [ID] или ответьте на сообщение' });
        userId = await extractNumericId(args[1]);
      }

      if (!userId) return context.send({ message: '❌ Некорректный ID' });

      const banInfo = await isSysBanned(userId);
      if (!banInfo) return context.send({ message: '❌ Пользователь не заблокирован' });

      if (banInfo.who !== context.userId || context.senderId) {
        const bannerAccess = await checkSysAccess(banInfo.who);
        if (senderAccess <= bannerAccess && bannerAccess > 0) {
          return context.send({ message: `❌ Вы не можете разблокировать пользователя, заблокированного администратором "${getAccessLevelName(bannerAccess)}"` });
        }
      }

      await databaseQuery('DELETE FROM sysbanned WHERE userid = ? OR user_id = ?', [userId, userId]);

      let userName = `@id${userId}`;
      try {
        const userInfo = await vk.api.users.get({ user_ids: [userId] });
        if (userInfo && userInfo[0] && userInfo[0].first_name) {
          userName = `@id${userId} (${userInfo[0].first_name} ${userInfo[0].last_name})`;
        }
      } catch(e) {}

      context.send({ message: `✅ ${userName} разблокирован в системе бота.`, disable_mentions: true });
    } catch (error) {
      console.error('Ошибка sysunban:', error);
      context.send({ message: '❌ Произошла ошибка при разблокировке.' });
    }
  },
};
