const { checkSysAccess } = require('./sysadmin.js');
const fs = require('fs');
const path = require('path');

function readVIP(userId) {
  const f = path.join(__dirname, '..', 'data', 'vip_users', `${userId}.json`);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}
function writeVIP(userId, data) {
  const dir = path.join(__dirname, '..', 'data', 'vip_users');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(data));
}

module.exports = {
  command: '/givevip',
  aliases: ['/выдатьвип', '/givevip'],
  description: 'Выдать VIP статус (Grand style)',
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
    if (!targetId) return context.reply('❌ /givevip [ID] [дни]\n0 — снять\n-1 или 600+ — навсегда');

    const days = parseInt(parts[2]) || 0;
    
    let vip = readVIP(targetId) || { userid: targetId, vip_type: 0, is_permanent: 0, expiry_date: null, granted_by: senderId, granted_date: new Date().toISOString() };
    
    let timeText = 'перманентно';
    let statusText = '0';
    let targetVip = 1;
    
    if (vip.vip_type && vip.vip_type > 0) {
      targetVip = vip.vip_type >= 20 ? vip.vip_type : vip.vip_type + 1;
    }
    
    if (days === 0) {
      // Снять VIP
      vip.vip_type = 0;
      vip.is_permanent = 0;
      vip.expiry_date = null;
      statusText = '0';
      timeText = 'снят';
    } else if (days >= 600 || days === -1) {
      // Навсегда
      vip.vip_type = targetVip;
      vip.is_permanent = 1;
      vip.expiry_date = null;
      statusText = String(targetVip);
    } else {
      // На N дней
      const expiry = new Date(Date.now() + days * 86400000).toISOString();
      vip.vip_type = targetVip;
      vip.is_permanent = 0;
      vip.expiry_date = expiry;
      timeText = new Date(expiry).toLocaleString('ru-RU');
      statusText = String(targetVip);
    }
    
    vip.granted_by = senderId;
    vip.granted_date = new Date().toISOString();
    writeVIP(targetId, vip);
    
    const senderName = (await require('../index.js').vk.api.users.get({ user_ids: [senderId] }))[0];
    const targetName = (await require('../index.js').vk.api.users.get({ user_ids: [targetId] }))[0];
    const sName = senderName ? `${senderName.first_name} ${senderName.last_name}` : `ID ${senderId}`;
    const tName = targetName ? `${targetName.first_name} ${targetName.last_name}` : `ID ${targetId}`;
    
    context.send(`✅ ${tName} получил VIP статус '${statusText}' уровня.\nДата окончания: ${timeText}\nВыдал: ${sName}`);
  }
};
