const { checkIfTableExists, getUserRole, getRoleName } = require('./roles.js');
const { getlink } = require('../util.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  command: '/games',
  aliases: ['/игры'],
  description: 'Включить/выключить игры',
  async execute(context) {
    const { peerId, senderId, text } = context;
    if (!await checkIfTableExists('roles_' + peerId)) return context.send('⚠️ Беседа не активирована');
    const role = await getUserRole(peerId, senderId);
    if (role < 100) return context.reply('⛔ Только Владелец.');
    const nick = await getlink(senderId);
    
    const confFile = path.join(__dirname, '..', 'data', 'conference', `${peerId}.json`);
    let conf = {};
    if (fs.existsSync(confFile)) conf = JSON.parse(fs.readFileSync(confFile, 'utf8'));
    
    const parts = text.split(' ');
    if (parts[1] === 'off') {
      conf.games = 0;
      fs.writeFileSync(confFile, JSON.stringify(conf));
      context.send('Игровые функции были отключены ' + nick);
    } else {
      conf.games = 1;
      fs.writeFileSync(confFile, JSON.stringify(conf));
      context.send('Игровые функции были включены ' + nick);
    }
  }
};
