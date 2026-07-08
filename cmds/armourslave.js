const fs = require('fs');
const path = require('path');
const { getlink } = require('../util.js');
function readSlave(userId) { const f = path.join(__dirname, '..', 'data', 'slaves', `${userId}.json`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function writeSlave(userId, d) { const dir = path.join(__dirname, '..', 'data', 'slaves'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(d)); }

module.exports = {
  command: '/цепи',
  aliases: ['/armourslave'],
  description: 'Накинуть цепи на раба',
  async execute(context) {
    const { senderId, text, replyMessage } = context;
    const parts = text.split(' ');
    let targetId = replyMessage ? replyMessage.senderId : parts[1];
    
    if (typeof targetId === 'string') {
      const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
      if (targetId.startsWith('@')) {
        try { const u = await require('../index.js').vk.api.users.get({ user_ids: [targetId.substring(1)] }); if (u && u[0]) targetId = u[0].id.toString(); } catch {}
      }
    }
    targetId = parseInt(targetId);
    if (!targetId || targetId <= 0 || targetId === senderId) return context.reply('Укажите ID раба.');
    
    const slave = readSlave(targetId);
    if (!slave || slave.owner != senderId) return context.reply('Вы не владеете этим рабом.');
    
    if (slave.armour && new Date(slave.armour) > new Date()) {
      return context.reply(`Пользователь уже имеет цепи до ${new Date(slave.armour).toLocaleString('ru-RU')}.`);
    }
    
    const ownerSlave = readSlave(senderId) || { armours: 0 };
    if ((ownerSlave.armours || 0) < 1) return context.reply('У вас нет цепей. Их можно получить в рулетке.');
    
    slave.armour = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    writeSlave(targetId, slave);
    ownerSlave.armours = (ownerSlave.armours || 1) - 1;
    writeSlave(senderId, ownerSlave);
    context.send(`Цепи накинуты на ${await getlink(targetId)}. Защита 12 часов.`);
  }
};
