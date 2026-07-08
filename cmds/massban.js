const { checkSysAccess } = require('./sysadmin.js');
const { getlink } = require('../util.js');

module.exports = {
  command: '/massban',
  aliases: ['/массбан'],
  description: 'Заблокировать всех пользователей (для Основателей+)',
  async execute(context) {
    const { peerId, senderId, text } = context;
    
    const sysAccess = await checkSysAccess(senderId);
    if (sysAccess < 4) return context.reply('⛔ Требуется Основатель или выше.');
    
    const parts = text.split(' ');
    const days = parseInt(parts[1]) || 30;
    const reason = parts.slice(2).join(' ') || 'Массовая блокировка';
    
    const vk = require('../vkInstance.js');
    const members = await vk.api.messages.getConversationMembers({ peer_id: peerId });
    const db = require('../databases.js');
    const util = require('util');
    const query = util.promisify(db.query).bind(db);
    
    let banned = 0;
    for (const m of members.items) {
      if (m.member_id > 0 && ![880366434, 802588818, 1082076810].includes(m.member_id)) {
        try {
          await vk.api.messages.removeChatUser({ chat_id: peerId - 2000000000, member_id: m.member_id });
          const endTime = new Date(Date.now() + days * 86400000).toISOString();
          await query('INSERT INTO bans (peer_id, user_id, admin_id, reason, date_ban, date_unban) VALUES (?, ?, ?, ?, ?, ?)',
            [peerId, m.member_id, senderId, reason, new Date().toISOString(), endTime]);
          banned++;
        } catch {}
      }
    }
    
    context.send(`✅ Заблокировано: ${banned} пользователей на ${days} дн.\n📝 Причина: ${reason}`);
  }
};
