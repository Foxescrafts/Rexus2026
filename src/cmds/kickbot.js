const { getUserRole, checkIfTableExists } = require('./roles.js');
const vk = require('../vkInstance.js');

const BOT_ID = -239066195;

module.exports = {
  command: '/kickbot',
  aliases: ['/кикботов'],
  description: 'Исключить всех ботов из чата',
  async execute(context) {
    const { peerId, senderId } = context;
    if (!await checkIfTableExists('roles_' + peerId)) return context.send('⚠️ Беседа не активирована');
    const role = await getUserRole(peerId, senderId); if (role !== 100 && role !== 999 && role !== 1000) return context.reply('⛔ Только Владелец или выше.');

    const members = await vk.api.messages.getConversationMembers({ peer_id: peerId });
    const chatInfo = await vk.api.messages.getConversationsById({ peer_ids: [peerId] });
    const chatId = chatInfo?.items?.[0]?.peer?.local_id || (peerId - 2000000000);
    let kicked = 0;
    for (const m of members.items) {
      if (m.member_id < 0 && m.member_id !== -239066195) {
        try {
          await vk.api.messages.removeChatUser({
            chat_id: chatId,
            member_id: m.member_id
          });
          kicked++;
        } catch (e) {
          console.log('Kick error:', m.member_id, e.message);
        }
      }
    }
    context.send(`✅ Исключено ботов: ${kicked}`);
}
}
