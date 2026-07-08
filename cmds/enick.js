const { getUserRole } = require('./roles.js');
const fs = require('fs');
const path = require('path');

function readVIP(userId) {
  const f = path.join(__dirname, '..', 'data', 'vip_users', `${userId}.json`);
  try { const v = JSON.parse(fs.readFileSync(f, 'utf8')); return v.is_permanent === 1 || (v.expiry_date && new Date(v.expiry_date) > new Date()); } catch { return false; }
}

module.exports = {
  command: '/enick',
  aliases: ['/эник'],
  description: 'Установить эмодзи в ник другому (VIP)',
  async execute(context) {
    const { senderId, text, peerId, replyMessage } = context;
    const parts = text.split(' ');
    let targetId = replyMessage ? replyMessage.senderId : parts[1];
    const emoji = parts.slice(2).join(' ');
    
    if (typeof targetId === 'string' && targetId.startsWith('@')) {
      try {
        const u = await require('../index.js').vk.api.users.get({ user_ids: [targetId.substring(1)] });
        if (u && u[0]) targetId = u[0].id;
      } catch {}
    }
    targetId = parseInt(targetId);
    
    if (!targetId || !emoji) return context.reply('❌ /enick [ID] [эмодзи]');
    if (!readVIP(senderId)) return context.reply('⛔ Только для VIP.');
    
    const db = require('../databases.js');
    const util = require('util');
    const query = util.promisify(db.query).bind(db);
    const member = await query(`SELECT nickname FROM nicknames_${peerId} WHERE user_id = ?`, [targetId]);
    const oldNick = member?.[0]?.nickname || '';
    
    const newNick = emoji + ' ' + oldNick;
    await query(`INSERT INTO nicknames_${peerId} (user_id, nickname) VALUES (?, ?) ON DUPLICATE KEY UPDATE nickname = ?`, [targetId, newNick, newNick]);
    
    const user = (await require('../index.js').vk.api.users.get({ user_ids: [targetId] }))[0];
    const name = user ? `${user.first_name} ${user.last_name}` : `ID ${targetId}`;
    context.send(`Эмодзи установлен в ник ${name}: ${newNick}`);
  }
};
