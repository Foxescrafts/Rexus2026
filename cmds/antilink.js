const { checkCommandPriority } = require('./editcmd.js');
const { getUserRole } = require('./roles.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: '/antilink',
  description: 'Включить/выключить фильтр ссылок',
  async execute(context) {
    const { peerId, senderId } = context;
    const userRole = await getUserRole(peerId, senderId);
    if (userRole < 60) return context.reply('⛔ Требуется Ст. Администратор или выше');

    const file = path.join(__dirname, '..', 'data', 'filters_' + peerId + '.json');
    let filters = {};
    if (fs.existsSync(file)) filters = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (filters.antilink) { delete filters.antilink; fs.writeFileSync(file, JSON.stringify(filters)); context.reply('🟢 Анти-ссылки выключены'); }
    else { filters.antilink = true; fs.writeFileSync(file, JSON.stringify(filters)); context.reply('🔴 Анти-ссылки включены — ссылки будут удаляться'); }
  }
};
