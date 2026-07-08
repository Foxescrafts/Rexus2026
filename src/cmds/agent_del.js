const { checkSysAccess } = require('./sysadmin.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: '/agent del',
  aliases: ['/агент del'],
  description: 'Удалить агента',
  async execute(context) {
    const { senderId, text, replyMessage } = context;
    if (await checkSysAccess(senderId) < 1) return context.reply('⛔ Только для агентов.');
    
    let targetId = replyMessage ? replyMessage.senderId : text.split(' ')[2];
    if (typeof targetId === 'string') {
      const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
      if (targetId.startsWith('@')) { try { const u = await require('../index.js').vk.api.users.get({ user_ids: [targetId.substring(1)] }); if (u && u[0]) targetId = u[0].id.toString(); } catch {} }
    }
    targetId = parseInt(targetId);
    if (!targetId) return context.reply('❌ /agent del [ID]');
    
    const file = path.join(__dirname, '..', 'data', 'sysadmins', `${targetId}.json`);
    if (!fs.existsSync(file)) return context.reply('Не в команде.');
    fs.unlinkSync(file);
    
    const u = (await require('../index.js').vk.api.users.get({ user_ids: [targetId] }))[0];
    context.send(`✅ ${u?.first_name || 'Пользователь'} удалён из агентов.`);
  }
};
