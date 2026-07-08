const { checkCommandPriority } = require('./editcmd.js');
const { getUserRole } = require('./roles.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: '/antimat',
  description: 'Включить/выключить фильтр мата',
  async execute(context) {
    const { peerId, senderId } = context;
    const userRole = await getUserRole(peerId, senderId);
    if (userRole < 60) return context.reply('⛔ Требуется Ст. Администратор или выше');

    const file = path.join(__dirname, '..', 'data', 'filters_' + peerId + '.json');
    let filters = {};
    if (fs.existsSync(file)) filters = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (filters.antimat) {
      delete filters.antimat;
      fs.writeFileSync(file, JSON.stringify(filters));
      context.reply('🟢 Анти-мат выключен');
    } else {
      filters.antimat = true;
      fs.writeFileSync(file, JSON.stringify(filters));
      context.reply('🔴 Анти-мат включен — мат будет удаляться');
    }
  }
};
