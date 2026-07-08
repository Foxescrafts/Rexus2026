const { getUserRole, checkIfTableExists } = require('./roles.js');
const vk = require('../vkInstance.js');

module.exports = {
  command: '/kickdogs',
  aliases: ['/кикдогов'],
  description: 'Исключить заблокированных пользователей',
  async execute(context) {
    const { peerId, senderId } = context;
    if (!await checkIfTableExists('roles_' + peerId)) return context.send('⚠️ Беседа не активирована');
    const role = await getUserRole(peerId, senderId); if (role !== 100 && role !== 999 && role !== 1000) return context.reply('⛔ Только Владелец или выше.');

    context.send('🔄 Поиск...');
    const members = await vk.api.messages.getConversationMembers({ peer_id: peerId, fields: ['deactivated'] });
    let kicked = 0;
    for (const m of members.items) {
      const profile = members.profiles?.find(p => p.id === m.member_id);
      if (profile && (profile.deactivated === 'deleted' || profile.deactivated === 'banned')) {
        try { await vk.api.messages.removeChatUser({ chat_id: peerId - 2000000000, member_id: m.member_id }); kicked++; } catch {}
      }
    }
    context.send(`✅ Исключено заблокированных: ${kicked}`);
  }
};
