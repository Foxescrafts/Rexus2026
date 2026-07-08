const { hasCommandAccess } = require('../utils/commandAccess.js');
const vk = require('../vkInstance.js');

module.exports = {
  command: '/send',
  aliases: ['/say', '/отправить'],
  description: 'Отправить сообщение от бота в чат',
  async execute(context) {
    if (!await hasCommandAccess(context.senderId, 'send')) return context.reply('❌ Нет прав.');
    const parts = context.text.split(/\s+/);
    if (parts.length < 3) return context.reply('❌ /send [ID] [сообщение]');
    const targetId = parseInt(parts[1]);
    if (!targetId || targetId <= 0) return context.reply('❌ Некорректный ID.');
    const msg = parts.slice(2).join(' ');
    await vk.api.messages.send({ peer_id: targetId, message: `💬 ${msg}`, random_id: Date.now() });
    context.send(`✅ Отправлено в ${targetId}`);
  }
};
