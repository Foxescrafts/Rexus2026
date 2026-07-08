const { checkSysAccess } = require('./sysadmin.js');
const { extractNumericId } = require('./ban.js');
const { getlink } = require('../util.js');

module.exports = {
  command: '/antispam',
  aliases: ['/антиспам', '/спамзащита'],
  description: 'Настройки антиспам-эскалации',
  async execute(context) {
    const { senderId, text, peerId, replyMessage } = context;
    const access = await checkSysAccess(senderId);
    if (access < 1) return context.reply('⛔ Только для агентов.');

    const parts = text.split(/\s+/);
    const sub = (parts[1] || 'status').toLowerCase();

    if (['reset', 'сброс'].includes(sub)) {
      let targetId = replyMessage?.senderId || parts[2];
      if (typeof targetId === 'string') {
        const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
        if (targetId.startsWith('@')) { try { const u = await require('../index.js').vk.api.users.get({ user_ids: [targetId.substring(1)] }); if (u[0]) targetId = u[0].id; } catch {} }
      }
      targetId = parseInt(targetId);
      if (!targetId) return context.reply('❌ /antispam reset [ID]');
      
      const link = await getlink(targetId);
      return context.reply(`✅ Антиспам для ${link} сброшен.`);
    }

    return context.reply(
      '🛡 Антиспам-эскалация\n\n' +
      '1️⃣ Первый спам: авто-мут\n' +
      '2️⃣ Повтор: варн\n' +
      '3️⃣ Ещё повтор: варн + мут\n' +
      '4️⃣ Следующий: кик\n' +
      '🌐 Глобальный спам: сусбан\n\n' +
      '/antispam reset @user — сброс'
    );
  }
};
