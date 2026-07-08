const { checkSysAccess } = require('./sysadmin.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: '/agent info',
  aliases: ['/агент info'],
  description: 'Информация об агенте',
  async execute(context) {
    const { senderId, text, replyMessage } = context;
    if (await checkSysAccess(senderId) < 1) return context.reply('⛔ Только для агентов.');
    
    let targetId = replyMessage ? replyMessage.senderId : text.split(' ')[2] || senderId;
    if (typeof targetId === 'string') {
      const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
      if (targetId.startsWith('@')) { try { const u = await require('../index.js').vk.api.users.get({ user_ids: [targetId.substring(1)] }); if (u && u[0]) targetId = u[0].id.toString(); } catch {} }
    }
    targetId = parseInt(targetId);
    
    const file = path.join(__dirname, '..', 'data', 'sysadmins', `${targetId}.json`);
    if (!fs.existsSync(file)) return context.reply('Не в команде.');
    
    const d = JSON.parse(fs.readFileSync(file, 'utf8'));
    const u = (await require('../index.js').vk.api.users.get({ user_ids: [targetId] }))[0];
    const name = u ? `${u.first_name} ${u.last_name}` : `ID ${targetId}`;
    const levels = { 1: 'Агент', 2: 'Администратор', 3: 'Зам.Основателя', 4: 'Основатель', 5: 'Разработчик' };
    context.send(`📊 ${name}\n🔑 ${levels[d.access] || d.access}\n🆔 ${targetId}`);
  }
};
