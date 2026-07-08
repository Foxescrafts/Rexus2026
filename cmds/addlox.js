const { getlink } = require('../util.js');
const { checkSysAccess } = require('./sysadmin.js');

module.exports = {
  command: '/addlox',
  description: 'Выдать роль лох',
  async execute(context) {
    const senderId = context.senderId;
    const sysAccess = await checkSysAccess(senderId);
    if (sysAccess < 2) return context.reply('⛔ Нет доступа');

    const args = context.text.split(' ');
    const targetId = parseInt(args[1]) || context.replyMessage?.senderId;
    if (!targetId) return context.reply('Используйте: /addlox [ID/ссылка]');

    const nameOne = await getlink(senderId);
    const nameTwo = await getlink(targetId);

    context.reply(`${nameTwo} получил новую роль.\nНазвание: лох\nВыдал: ${nameOne}`);
  }
};
