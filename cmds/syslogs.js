const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'data', 'logs');

module.exports = {
  command: '/syslogs',
  aliases: ['/системлоги', '/суслогс'],
  description: 'Системные логи системные логи',
  async execute(context) {
    const access = await checkSysAccess(context.senderId);
    if (access < 2) return context.reply(`⛔ Требуется Администратор+. Ваш уровень: ${getAccessLevelName(access)} (${access})`);

    const parts = String(context.text || '').trim().split(/\s+/);
    const sub = (parts[1] || 'status').toLowerCase();

    if (sub === 'status') {
      if (!fs.existsSync(LOGS_DIR)) return context.reply('Логи пусты.');
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith('logs_'));
      let msg = `📋 SYSLOGS\n\nЛог-файлов: ${files.length}\n\n`;
      msg += 'Доступные команды:\n';
      msg += '/syslogs user [ID] — логи пользователя\n';
      msg += '/syslogs chat [peerId] — логи беседы\n';
      msg += '/syslogs recent [N] — последние записи';
      return context.reply(msg);
    }

    if (sub === 'recent' || sub === 'last') {
      const limit = parseInt(parts[2]) || 10;
      if (!fs.existsSync(LOGS_DIR)) return context.reply('Логи пусты.');
      const files = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith('logs_'));
      let allLogs = [];
      for (const f of files.slice(-5)) {
        try { allLogs = allLogs.concat(JSON.parse(fs.readFileSync(path.join(LOGS_DIR, f, 'logs.json'), 'utf8'))); } catch {}
      }
      const recent = allLogs.slice(-limit).reverse();
      if (!recent.length) return context.reply('Нет записей.');
      let msg = `🧾 Последние ${recent.length} записей:\n\n`;
      for (const l of recent) {
        msg += `• ${new Date(l.date || l.createdAt || Date.now()).toLocaleString('ru-RU')}: ${l.text || l.action || '—'} (peer: ${l.peer_id || l.peerId})\n`;
      }
      return context.reply(msg);
    }

    return context.reply('/syslogs status | /syslogs recent [N]');
  }
};
