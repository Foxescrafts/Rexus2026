const { getUserRole } = require('./roles.js');
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'safety_levels.json');
function read() { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } }
function write(d) { fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); }

module.exports = {
  command: '/safety',
  aliases: ['/уровеньзащиты', '/сафети'],
  description: 'Уровень безопасности беседы (1-3)',
  async execute(ctx) {
    if (ctx.peerId < 2000000000) return ctx.reply('Только в беседе.');
    if (await getUserRole(ctx.peerId, ctx.senderId) < 60) return ctx.reply('⛔ Роль 60+');

    const parts = String(ctx.text || '').trim().split(/\s+/);
    const sub = String(parts[1] || 'status');
    const levels = read();

    if (sub === 'status') {
      const lvl = levels[ctx.peerId] || 1;
      return ctx.reply(`🛡 Уровень безопасности: ${lvl}/3\n/safety 1/2/3`);
    }

    if (['1', '2', '3'].includes(sub)) {
      levels[ctx.peerId] = Number(sub);
      write(levels);
      const names = { 1: 'Базовая', 2: 'Усиленная', 3: 'Тихая' };
      return ctx.reply(`✅ Уровень ${sub}/3 — ${names[sub]}`);
    }

    return ctx.reply('/safety 1/2/3');
  }
};
