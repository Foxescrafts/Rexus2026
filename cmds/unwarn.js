const database = require('../databases.js');
const { checkUserRole, checkIfTableExists, getUserRole, getRoleName, getRoleNamezov } = require('./roles.js');
const { extractNumericId } = require('./ban.js');
const util = require('util');
const { addLog } = require('../utils/logs.js');
const { checkCommandPriority, getCommandPriorities } = require('./editcmd.js');
const { getlink } = require('../util.js');

const queryAsync = util.promisify(database.query).bind(database);

module.exports = {
  command: '/unwarn',
  description: 'Снять варн у пользователя',
  execute: async (context) => {
    const { peerId, text, senderId, replyMessage } = context;
    const messageText = context.text;
    const conferenceId = peerId;
    const parts = messageText.split(' ');

    if (!await checkIfTableExists(`roles_${conferenceId}`)) {
      return context.send('⚠️ Беседа не активирована | Для активации используйте команду /start');
    }

    const hasPermission = await checkCommandPriority(peerId, senderId, '/unwarn');
    if (!hasPermission) {
      const priorities = await getCommandPriorities(peerId);
      const requiredRole = priorities['/unwarn'] || 20;
      const senderRole = await getUserRole(peerId, context.senderId);
      const senderRoleName = await getRoleName(peerId, senderRole);
      return context.reply(`⛔ Доступ запрещён | Для использования команды /unwarn требуется приоритет ${requiredRole} или выше\n👤 Ваша роль: ${senderRoleName} (приоритет ${senderRole})`);
    }

    const target = replyMessage ? replyMessage.senderId : parts[1];
    let targetUserId = await extractNumericId(target || senderId);
    if(replyMessage) targetUserId = replyMessage.senderId;

    if (!targetUserId) {
      return context.reply('⚠️ Не указан пользователь | Укажите пользователя для снятия предупреждения');
    }

    try {
      const senderRole = await getUserRole(peerId, senderId);
      
      // Получаем warns_history чтобы узнать кто выдал варн
      const getWarnsQuery = `SELECT warns, warns_history FROM conference_${peerId} WHERE user_id = ?`;
      const [rows] = await queryAsync(getWarnsQuery, [targetUserId]);

      const currentWarns = parseInt(rows?.warns) || 0;
      if (currentWarns === 0) {
        return context.reply('✅ Нет предупреждений | У пользователя нет активных предупреждений');
      }

      // Парсим историю и берём последний варн
      let warnedByRole = 0;
      try {
        if (rows?.warns_history) {
          const history = JSON.parse(rows.warns_history);
          if (Array.isArray(history) && history.length > 0) {
            const lastWarn = history[history.length - 1];
            if (lastWarn.Author) {
              warnedByRole = await getUserRole(peerId, lastWarn.Author);
            }
          }
        }
      } catch (e) {
        console.error('Ошибка парсинга warns_history:', e);
      }

      // Снимающий должен быть СТРОГО выше того кто выдал варн
      if (senderRole <= warnedByRole && warnedByRole > 0) {
        const senderRoleName = await getRoleName(peerId, senderRole);
        const warnerRoleName = await getRoleName(peerId, warnedByRole);
        return context.reply(`⛔ Недостаточно прав | Варн был выдан ${warnerRoleName} (приоритет ${warnedByRole})\n👤 Ваша роль: ${senderRoleName} (приоритет ${senderRole})\nТребуется роль выше ${warnedByRole}`);
      }

      const newWarns = Math.max(0, currentWarns - 1);
      await queryAsync(`UPDATE conference_${peerId} SET warns = ? WHERE user_id = ?`, [newWarns, targetUserId]);

      try {
        const roleName = await getRoleName(peerId, senderRole);
        addLog(peerId, senderId, targetUserId, 'unwarn', `Снято предупреждение. Осталось: ${newWarns}/3`).catch(() => {});
        const adminLink = await getlink(senderId);
        const targetLink = await getlink(targetUserId);
        context.reply(`✅️ ${adminLink} | ${roleName} снял предупреждение с ${targetLink}`);
      } catch (error) {
        const targetLink = await getlink(targetUserId);
        context.reply(`✅️ Вы сняли предупреждение с ${targetLink}\nОсталось предупреждений: [${newWarns}/3]`);
      }
    } catch (error) {
      console.error('Ошибка при снятии варна:', error);
      context.reply('❌ Ошибка системы | Не удалось снять предупреждение');
    }
  },
};
