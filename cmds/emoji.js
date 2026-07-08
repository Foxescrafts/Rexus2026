const { getUserRole } = require('./roles.js');
const fs = require('fs');
const path = require('path');

function readVIP(userId) {
  const f = path.join(__dirname, '..', 'data', 'vip_users', `${userId}.json`);
  try { const v = JSON.parse(fs.readFileSync(f, 'utf8')); return v.is_permanent === 1 || (v.expiry_date && new Date(v.expiry_date) > new Date()); } catch { return false; }
}

module.exports = {
  command: '/emoji',
  aliases: ['/эмодзи'],
  description: 'Установить эмодзи в ник (VIP)',
  async execute(context) {
    const { senderId, text, peerId } = context;
    const parts = text.split(' ');
    const emoji = parts.slice(1).join(' ');
    
    if (!emoji) return context.reply('Укажите эмодзи: /emoji 🌟');
    if (!readVIP(senderId)) return context.reply('⛔ Только для VIP.');
    
    // Получаем текущий ник
    const db = require('../databases.js');
    const util = require('util');
    const query = util.promisify(db.query).bind(db);
    const member = await query(`SELECT nick FROM nicknames_${peerId} WHERE user_id = ?`, [senderId]);
    const oldNick = member?.[0]?.nick || '';
    
    const newNick = emoji + ' ' + oldNick;
    await query(`INSERT INTO nicknames_${peerId} (user_id, nickname) VALUES (?, ?) ON DUPLICATE KEY UPDATE nickname = ?`, [senderId, newNick, newNick]);
    
    const user = (await require('../index.js').vk.api.users.get({ user_ids: [senderId] }))[0];
    const name = user ? `${user.first_name} ${user.last_name}` : `ID ${senderId}`;
    context.send(`${name} установил(а) эмодзи в ник: ${newNick}`);
  }
};
