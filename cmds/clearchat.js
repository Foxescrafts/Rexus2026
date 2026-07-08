// Команда очистки чата (только Разработчик)
const { checkSysAccess } = require('./sysadmin.js');
const { vk } = require('../index.js');

module.exports = {
  command: '/clearchat',
  description: 'Удалить все сообщения в чате (Разработчик)',
  async execute(context) {
    const senderId = context.senderId;
    const access = await checkSysAccess(senderId);
    if (access < 5) return context.reply('⛔ Только Разработчик.');

    const peerId = context.peerId;
    if (peerId < 2000000000) return context.reply('❌ Только в беседе.');

    try {
      // Удаляем последние 100 сообщений (максимум за раз)
      let deleted = 0;
      for (let i = 0; i < 10; i++) {
        // Получаем сообщения
        const msgs = await vk.api.messages.getHistory({
          peer_id: peerId,
          count: 100,
          offset: 0
        });
        
        if (!msgs.items || msgs.items.length === 0) break;
        
        const ids = msgs.items.map(m => m.conversation_message_id || m.id);
        await vk.api.messages.delete({
          peer_id: peerId,
          conversation_message_ids: ids,
          delete_for_all: true
        });
        
        deleted += ids.length;
        if (ids.length < 100) break;
        await new Promise(r => setTimeout(r, 500));
      }
      context.reply(`🗑 Удалено ${deleted} сообщений.`);
    } catch(e) {
      context.reply('❌ Ошибка: ' + e.message);
    }
  }
};
