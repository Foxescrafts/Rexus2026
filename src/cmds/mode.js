const { getUserRole } = require('./roles.js');

module.exports = {
  command: '/mode',
  aliases: ['/режим', '/chatmode'],
  description: 'Режим чата',
  async execute(context) {
    const parts = String(context.text || '').trim().split(/\s+/);
    const sub = (parts[1] || 'status').toLowerCase();

    if (sub === 'status') {
      return context.reply('🔄 Режим: стандартный\n\n/mode grand — Grand\n/mode iris — Iris\n/mode nore — Nore');
    }

    if (await getUserRole(context.peerId, context.senderId) < 80) return context.reply('⛔ Роль 80+');

    if (['grand', 'iris', 'nore'].includes(sub)) {
      return context.reply(`✅ Режим "${sub}" установлен.`);
    }

    return context.reply('❌ /mode grand/iris/nore');
  }
};
