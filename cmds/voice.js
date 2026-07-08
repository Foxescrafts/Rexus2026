const { vk } = require('../index.js');
const { checkSysAccess } = require('./sysadmin.js');

module.exports = {
    command: '/voice',
    aliases: ['/скажи'],
    description: 'Отправить сообщение от имени бота (только для создателей)',
    async execute(context) {
        const { senderId, text, peerId, conversationMessageId } = context;
        const parts = text.split(' ');
        const msg = parts.slice(1).join(' ');

        const access = await checkSysAccess(senderId);
        if (access < 5) {
            return context.reply('⛔ Только для создателей.');
        }

        if (!msg) {
            return context.reply('❌ Использование: /voice [текст]');
        }

        // Проверка на ссылки
        if (msg.match(/https?:\/\/|vk\.com|vk\.ru/)) {
            return context.reply('Нельзя использовать ссылки от имени бота.');
        }

        // Проверка на английские буквы
        if (msg.match(/[A-Za-z]/)) {
            return context.reply('Нельзя использовать английские буквы от имени бота.');
        }

        try {
            await vk.api.messages.delete({
                peer_id: peerId,
                conversation_message_ids: [conversationMessageId],
                delete_for_all: true
            });
        } catch (e) {}

        context.send(msg);
    }
};
