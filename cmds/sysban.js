// command_sysban 1 в 1 из Grand (ls_cmds.cs)
const database = require('../databases.js');
const { checkSysAccess, getAccessLevelName, isSysBanned } = require('./sysadmin.js');
const { hasCommandAccess, getAccessDeniedMessage } = require('../utils/commandAccess.js');
const { extractNumericId } = require('./ban.js');
const vk = require('../vkInstance.js');
const util = require('util');
const databaseQuery = util.promisify(database.query);
const { Keyboard } = require('vk-io');

module.exports = {
  command: '/sysban',
  description: 'Блокировка пользователя в системе бота',
  async execute(context) {
    try {
      const hasAccess = await hasCommandAccess(context.senderId, 'sysban');
      if (!hasAccess) return context.reply(getAccessDeniedMessage('sysban'));

      const senderAccess = await checkSysAccess(context.senderId);
      const args = context.text.split(' ');
      if (args.length < 3) return context.reply('❌ /sysban [ID] [тип] [дни] [причина]\nТипы: 1-исключать, 2-исключать+увед, 3-молча, 4-бот, 5-сливер');

      let userId = context.replyMessage?.senderId || await extractNumericId(args[1]);
      if (!userId) return context.reply('Не удалось найти информацию про этого пользователя.');
      if (userId === 802588818) return context.reply('⛔ Данный пользователь — Генеральный Директор Rexus.');
      if (userId === context.senderId) return context.reply('❌ Нельзя заблокировать себя');

      const targetAccess = await checkSysAccess(userId);
      if (targetAccess >= senderAccess && targetAccess > 0) return context.reply('❌ Нельзя заблокировать пользователя с равным/высшим доступом');

      const banInfo = await isSysBanned(userId);
      if (banInfo) return context.reply('Данный пользователь уже заблокирован.');

      const type = parseInt(args[2]) || 1;
      if (type < 1 || type > 5) return context.reply('❌ Тип от 1 до 5');

      const days = parseInt(args[3]) || 0;
      const reason = args.slice(4).join(' ') || 'не указана.';

      const currentTime = Math.floor(Date.now() / 1000);
      const endTime = days === 0 ? 0 : currentTime + (days * 86400);

      await databaseQuery('INSERT INTO sysbanned (userid, time, reason, who, type_ban) VALUES (?, ?, ?, ?, ?)',
        [userId, endTime, reason, context.senderId, type]);

      const nameOne = await getlink(context.senderId);
      const nameTwo = await getlink(userId);
      const adminName = nameOne;
      const userName = nameTwo;

      const buttons = Keyboard.builder()
        .callbackButton({ label: 'Разблокировать', payload: { command: 'sysunban', target: userId }, color: Keyboard.POSITIVE_COLOR })
        .inline();

      let msg = '';
      if (type === 4) {
        msg = adminName + ' пометил ' + userName + ' как страничного бота.\n\nТеперь он не сможет использовать некоторые команды.';
      } else if (type === 5) {
        msg = adminName + ' пометил ' + userName + ' как сливера бесед.\n\nТеперь он не сможет использовать команды /ban /warn и /kick.';
      } else {
        msg = adminName + ' заблокировал доступ к боту ' + userName + '.\n\nТеперь он не сможет взаимодействовать с ботом.';
      }

      context.send({ message: msg, keyboard: buttons });

      // Исключение из бесед для типов 1 и 2 (как в Grand)
      if (type === 1 || type === 2) {
        try {
          const fs = require('fs'), path = require('path');
          const confDir = path.join(__dirname, '..', 'data');
          const dirs = fs.readdirSync(confDir).filter(d => d.startsWith('conference_'));
          for (const dir of dirs) {
            const peerId = parseInt(dir.replace('conference_', ''));
            const userFile = path.join(confDir, dir, userId + '.json');
            if (fs.existsSync(userFile)) {
              try { await vk.api.messages.removeChatUser({ chat_id: peerId - 2000000000, member_id: userId }); } catch {}
              if (type === 2) {
                try { await vk.api.messages.send({ peer_id: peerId, message: userName + ' находится в чёрном списке бота, он(а) исключен(а) из соображений безопасности.', random_id: Date.now() }); } catch {}
              }
            }
          }
        } catch(e) {}
      }
    } catch (error) {
      console.error('Ошибка при выполнении команды sysban:', error);
      context.reply('❌ Произошла ошибка при выполнении команды');
    }
  },
};
