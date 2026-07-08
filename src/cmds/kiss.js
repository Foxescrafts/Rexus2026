const { getlink } = require('../util.js');

module.exports = {
  command: '/kiss',
  aliases: ['/поцеловать', '/поцелуй'],
  description: 'Поцеловать пользователя',
  async execute(context) {
    const { senderId, replyMessage, text } = context;
    const parts = text.split(' ');
    let targetId = replyMessage?.senderId || parts[1];

    if (!targetId || isNaN(targetId)) {
      return context.reply('❌ Использование: /kiss [ID] или ответьте на сообщение');
    }

    targetId = parseInt(targetId);
    if (targetId === senderId) {
      return context.reply('❌ Нельзя поцеловать самого себя');
    }
    if (targetId < 0) return context.reply('Данная команда недоступна для сообществ.');
    if (targetId === senderId) return context.reply('💋 Вы поцеловали себя.');

    const senderInfo = await vk.api.users.get({ user_ids: [senderId] });
    const doKiss = senderInfo[0]?.sex === 1 ? 'поцеловала' : 'поцеловал(а)';

    const senderName = await getlink(senderId);
    const targetName = await getlink(targetId);

    context.send(`👄 ${senderName} ${doKiss} ${targetName}`);
  }
};
