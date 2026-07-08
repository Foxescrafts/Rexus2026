const fs = require('fs');
const path = require('path');
const { getlink } = require('../util.js');
function readSlave(userId) { const f = path.join(__dirname, '..', 'data', 'slaves', `${userId}.json`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function writeSlave(userId, d) { const dir = path.join(__dirname, '..', 'data', 'slaves'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(d)); }

module.exports = {
  command: '/датьработу',
  aliases: ['/slavejob'],
  description: 'Назначить работу рабу',
  async execute(context) {
    const { senderId, text, replyMessage } = context;
    const parts = text.split(' ');
    let targetId = replyMessage ? replyMessage.senderId : parts[1];
    
    if (typeof targetId === 'string') {
      const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
      if (targetId.startsWith('@')) {
        try {
          const u = await require('../index.js').vk.api.users.get({ user_ids: [targetId.substring(1)] });
          if (u && u[0]) targetId = u[0].id.toString();
        } catch {}
      }
    }
    targetId = parseInt(targetId);
    
    const job = parts.slice(2).join(' ') || 'Безработный';
    if (!targetId) return context.reply('Укажите ID раба.');
    
    const slave = readSlave(targetId);
    if (!slave || slave.owner != senderId) return context.reply('Вы не владеете этим рабом.');
    
    slave.job = job;
    writeSlave(targetId, slave);
    context.send(`${await getlink(targetId)} теперь работает как "${job}"`);
  }
};
