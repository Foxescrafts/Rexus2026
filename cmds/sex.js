const { getlink } = require('../util.js');
const fs = require('fs');
const path = require('path');

function getMarriages(chatId) {
  const file = path.join(__dirname, '..', 'data', `marriages_${chatId}.json`);
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

module.exports = {
  command: '/sex',
  aliases: ['/секс', '/трах'],
  description: 'Заняться сексом (только в браке)',
  async execute(context) {
    const { senderId, replyMessage, text, peerId } = context;
    const parts = text.split(' ');
    let targetId = replyMessage?.senderId || parts[1];

    if (!targetId || isNaN(targetId)) {
      return context.reply('❌ Использование: /sex [ID] или ответьте на сообщение');
    }

    targetId = parseInt(targetId);
    if (targetId === senderId) return context.reply('❌ Нельзя заняться сексом с самим собой');

    // Проверка брака
    const marriages = getMarriages(peerId);
    const married = marriages.find(m => 
      (m.user1 === senderId && m.user2 === targetId) || 
      (m.user1 === targetId && m.user2 === senderId)
    );

    if (!married) {
      return context.reply('❌ Вы не в браке с этим пользователем. Сначала заключите брак /брак');
    }

    const senderLink = await getlink(senderId);
    const targetLink = await getlink(targetId);

    const phrases = [
      `🔞 ${senderLink} и ${targetLink} уединились`,
      `🔥 ${senderLink} страстно занялся сексом с ${targetLink}`,
      `💕 ${senderLink} и ${targetLink} провели ночь вместе`,
      `😈 ${senderLink} соблазнил(а) ${targetLink}`,
      `🍆 ${senderLink} и ${targetLink} занимаются грязными делами`
    ];

    context.send(phrases[Math.floor(Math.random() * phrases.length)]);
  }
};
