const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const { getUserRole, getRoleName, checkIfTableExists } = require('./roles.js');
const { extractNumericId } = require('./ban.js');
const { getlink } = require('../util.js');

module.exports = {
  command: '/sysroles',
  aliases: ['/sysroleplus', '/скрытыероли'],
  description: 'Выдать скрытую системную роль',
  async execute(context) {
    const access = await checkSysAccess(context.senderId);
    if (access < 5 && context.senderId !== 802588818) return context.reply(`⛔ Только Разработчик. Ваш уровень: ${getAccessLevelName(access)} (${access})`);

    const parts = String(context.text || '').trim().split(/\s+/);
    let targetId = context.replyMessage?.senderId || parts[1];
    const roleId = context.replyMessage ? parseInt(parts[1]) : parseInt(parts[2]);

    if (!targetId || !roleId) return context.reply('❌ /sysroles [ID] [101-103, 999, 1000]');

    if (typeof targetId === 'string') {
      const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
      if (targetId.startsWith('@')) { try { const u = await require('../vkInstance.js').api.users.get({ user_ids: [targetId.substring(1)] }); if (u[0]) targetId = u[0].id; } catch {} }
    }
    targetId = parseInt(targetId);
    if (!targetId) return context.reply('❌ Пользователь не найден.');

    const db = require('../databases.js');
    const util = require('util');
    const query = util.promisify(db.query).bind(db);

    const prevRole = await getUserRole(context.peerId, targetId);
    const prevName = await getRoleName(context.peerId, prevRole);

    await query(`INSERT INTO roles_${context.peerId} (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = ?`, [targetId, roleId, roleId]);

    const targetLink = await getlink(targetId);
    const issuerLink = await getlink(context.senderId);
    const roleNames = { 101: 'Системная роль [101]', 102: 'Системная роль [102]', 103: 'Главный следящий', 999: 'Скрытая роль 999', 1000: 'Разработчик' };
    const currentRole = await getUserRole(context.peerId, targetId);
    // if ([101, 102, 103, 999, 1000].includes(currentRole)) return context.reply("⛔ Нельзя изменить роль этому пользователю.");

    context.reply(`✅ Скрытая роль выдана\n👤 ${targetLink}\n🏷 ${roleNames[roleId] || 'Роль ' + roleId} (${roleId})\n🔹 Было: ${prevName} (${prevRole})\n🛠 Выдал: ${issuerLink}`);
  }
};
