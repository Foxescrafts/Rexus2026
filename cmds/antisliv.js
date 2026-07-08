const { checkSysAccess } = require('./sysadmin.js');
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'antisliv.json');
function readSettings() { try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; } }
function writeSettings(d) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(d, null, 2)); }

module.exports = {
  command: '/antisliv',
  aliases: ['/антислив'],
  description: 'Защита от слива беседы',
  async execute(context) {
    const { senderId, text, peerId, replyMessage } = context;
    const access = await checkSysAccess(senderId);
    if (access < 2) return context.reply('⛔ Только для Администратора+.');

    const parts = text.split(/\s+/);
    const action = (parts[1] || 'status').toLowerCase();
    const settings = readSettings();
    if (!settings[peerId]) settings[peerId] = { enabled: false, cooldown: 30, limit: 5 };
    const s = settings[peerId];

    if (action === 'on') { s.enabled = true; writeSettings(settings); return context.reply('✅ Антислив включён.'); }
    if (action === 'off') { s.enabled = false; writeSettings(settings); return context.reply('✅ Антислив выключен.'); }

    if (action === 'status') {
      return context.reply(`🛡 Антислив\nСтатус: ${s.enabled ? 'вкл' : 'выкл'}\nКулдаун: ${s.cooldown}с\nЛимит: ${s.limit} действ.\n\n/antisliv on/off`);
    }

    return context.reply('❌ /antisliv on/off/status');
  }
};
