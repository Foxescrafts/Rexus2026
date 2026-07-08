const { getUserRole } = require('./roles.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'chatguard');
const DEFAULT = { enabled: true, mode: 'balance', bypassRole: 20, modules: { spam: true, flood: true, links: false, caps: false, mentions: true, raid: true }, actions: { spam: 'warn', flood: 'warn', links: 'delete', caps: 'warn', mentions: 'warn', raid: 'silent' } };

function ensure() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
function file(peerId) { ensure(); return path.join(DATA_DIR, `${peerId}.json`); }
function load(peerId) { try { return { ...DEFAULT, ...JSON.parse(fs.readFileSync(file(peerId), 'utf8')) }; } catch { return { ...DEFAULT }; } }
function save(peerId, cfg) { fs.writeFileSync(file(peerId), JSON.stringify(cfg, null, 2)); }

function status(c) {
  return `ChatGuard PRO\nСтатус: ${c.enabled ? 'вкл' : 'выкл'}\nРежим: ${c.mode}\nОбход: роль ${c.bypassRole}+\n\nspam: ${c.modules.spam ? '✅' : '❌'} / ${c.actions.spam}\nflood: ${c.modules.flood ? '✅' : '❌'} / ${c.actions.flood}\nlinks: ${c.modules.links ? '✅' : '❌'} / ${c.actions.links}\ncaps: ${c.modules.caps ? '✅' : '❌'} / ${c.actions.caps}\nmentions: ${c.modules.mentions ? '✅' : '❌'} / ${c.actions.mentions}\nraid: ${c.modules.raid ? '✅' : '❌'} / ${c.actions.raid}\n\n/chatguard freedom | balance | strict`;
}

module.exports = {
  command: '/chatguard',
  aliases: ['/guard', '/чатгвард'],
  description: 'Гибкая защита чата',
  async execute(ctx) {
    if (ctx.peerId < 2000000000) return ctx.reply('Только в беседах.');
    if (await getUserRole(ctx.peerId, ctx.senderId) < 60) return ctx.reply('⛔ Роль 60+');

    const args = String(ctx.text || '').trim().split(/\s+/).slice(1);
    const sub = String(args[0] || 'status').toLowerCase();
    const cfg = load(ctx.peerId);

    if (['status', 'статус'].includes(sub)) return ctx.reply(status(cfg));
    if (['on', 'вкл'].includes(sub)) { cfg.enabled = true; save(ctx.peerId, cfg); return ctx.reply('ChatGuard включён.'); }
    if (['off', 'выкл'].includes(sub)) { cfg.enabled = false; save(ctx.peerId, cfg); return ctx.reply('ChatGuard выключен.'); }
    if (['freedom', 'balance', 'strict'].includes(sub)) {
      if (sub === 'freedom') { cfg.modules = { spam: true, flood: true, links: false, caps: false, mentions: false, raid: true }; cfg.bypassRole = 20; }
      if (sub === 'balance') { cfg.modules = { spam: true, flood: true, links: false, caps: false, mentions: true, raid: true }; cfg.bypassRole = 20; }
      if (sub === 'strict') { cfg.modules = { spam: true, flood: true, links: true, caps: true, mentions: true, raid: true }; cfg.bypassRole = 40; }
      cfg.mode = sub; save(ctx.peerId, cfg); return ctx.reply(`Режим: ${sub}`);
    }

    return ctx.reply(status(cfg));
  }
};
