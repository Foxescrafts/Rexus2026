const { checkIfTableExists, getUserRole, getRoleName } = require('./roles.js');
const { checkCommandPriority, getCommandPriorities } = require('./editcmd.js');
const { getlink } = require('../util.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: '/gm',
  aliases: ['/иммунитет', '/gamemode'],
  description: 'Выдать/снять иммунитет',
  async execute(context) {
    const { peerId, senderId, text, replyMessage } = context;
    const parts = text.split(' ');
    let targetId = replyMessage?.senderId || parts[1];

    if (!targetId) return context.reply('❌ Использование: /gm [ID]');
    targetId = parseInt(targetId);
    if (isNaN(targetId) || targetId <= 0) return context.reply('❌ Некорректный ID');
    if (targetId === senderId) return context.reply('❌ Нельзя выдать иммунитет самому себе');

    if (!await checkIfTableExists('roles_' + peerId)) return context.send('⚠️ Беседа не активирована');

    const hasPermission = await checkCommandPriority(peerId, senderId, '/gm');
    if (!hasPermission) {
      const priorities = await getCommandPriorities(peerId);
      const reqRole = priorities['/gm'] || 60;
      const senderRole = await getUserRole(peerId, senderId);
      const senderRoleName = await getRoleName(peerId, senderRole);
      return context.reply('⛔ Требуется приоритет ' + reqRole + ' или выше\n👤 Ваша роль: ' + senderRoleName);
    }

    const file = path.join(__dirname, '..', 'data', 'gm_' + peerId + '.json');
    let gmList = [];
    try { if (fs.existsSync(file)) gmList = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}

    const targetLink = await getlink(targetId);
    if (gmList.includes(targetId)) {
      gmList = gmList.filter(id => id !== targetId);
      fs.writeFileSync(file, JSON.stringify(gmList));
      context.send('🛡 ' + targetLink + ' лишён иммунитета.');
    } else {
      gmList.push(targetId);
      fs.writeFileSync(file, JSON.stringify(gmList));
      context.send('🛡 ' + targetLink + ' получил иммунитет.');
    }
  }
};
