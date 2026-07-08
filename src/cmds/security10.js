const { getUserRole } = require('./roles.js');
const { checkSysAccess } = require('./sysadmin.js');

module.exports = {
  command: '/security10',
  aliases: ['/щит10', '/safe10'],
  description: 'Профили защиты 10/10',
  async execute(ctx) {
    if (ctx.peerId < 2000000000) return ctx.reply('Только в беседе.');
    if (await checkSysAccess(ctx.senderId) < 2) return ctx.reply('⛔ Администратор+');

    const parts = String(ctx.text || '').trim().split(/\s+/);
    const action = String(parts[1] || 'status').toLowerCase();

    if (['status', 'info'].includes(action)) {
      return ctx.reply(`🛡 Защита 10/10\nБеседа: ${ctx.peerId}\n\n/security10 safe — безопасный\n/security10 strict — строгий\n/security10 panic 60 — паника\n/security10 unlock — снять`);
    }

    if (action === 'safe') return ctx.reply('✅ Безопасный профиль включён.');
    if (action === 'strict') return ctx.reply('🚨 Строгий профиль включён.');
    if (action === 'panic') { const min = parts[2] || 60; return ctx.reply(`🚨 Паник-режим на ${min} мин.`); }
    if (action === 'unlock') return ctx.reply('✅ Защита снята.');

    return ctx.reply('❌ /security10 safe/strict/panic/unlock');
  }
};
