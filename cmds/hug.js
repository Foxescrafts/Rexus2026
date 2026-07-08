const { getlink } = require('../util.js');

module.exports = {
  command: '/обнять',
  aliases: ['/обнимаю', '/обниму', '/hug'],
  description: 'Обнять пользователя',
  async execute(context) {
    const { senderId, replyMessage, text } = context;
    const parts = text.split(' ');
    let targetId = replyMessage?.senderId || parts[1];

    if (!targetId || isNaN(targetId)) {
      return context.reply('❌ Использование: /обнять [ID] или ответьте на сообщение');
    }

    targetId = parseInt(targetId);
    if (targetId === senderId) {
      return context.reply('❌ Нельзя обнять самого себя');
    }
    if (targetId < 0) return context.reply('Данная команда недоступна для сообществ.');
    if (targetId === senderId) return context.reply('🤗 Вы обняли себя.');

    const senderInfo = await vk.api.users.get({ user_ids: [senderId] });
    const doHug = senderInfo[0]?.sex === 1 ? 'обняла' : 'обнял(а)';

    const senderName = await getlink(senderId);
    const targetName = await getlink(targetId);

    context.send(`🤗 ${senderName} ${doHug} ${targetName}`);
  }
};
