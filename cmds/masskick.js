const { checkSysAccess } = require('./sysadmin.js');

module.exports = {
  command: '/masskick',
  aliases: ['/масскик', '/киквсех'],
  description: 'Исключить всех пользователей (для Основателей+)',
  async execute(context) {
    const { peerId, senderId } = context;
    
    const sysAccess = await checkSysAccess(senderId);
    if (sysAccess < 4) return context.reply('⛔ Требуется системная роль Основатель или выше.');

    const vk = require('../vkInstance.js');
    const members = await vk.api.messages.getConversationMembers({ peer_id: peerId });

    const protected = [880366434, 802588818, 1082076810]; // ты, full_gas_only, d1nil1

    let kicked = 0;
    for (const m of members.items) {
      if (m.member_id > 0 && !protected.includes(m.member_id)) {
        try {
          await vk.api.messages.removeChatUser({ chat_id: peerId - 2000000000, member_id: m.member_id });
          kicked++;
        } catch {}
      }
    }

    context.send(`✅ Исключено пользователей: ${kicked}`);
  }
};
