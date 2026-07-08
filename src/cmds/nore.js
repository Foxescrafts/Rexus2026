const { getUserRole } = require('./roles.js');
const { checkSysAccess } = require('./sysadmin.js');
const fs = require('fs');
const path = require('path');

const NORE_FILE = path.join(__dirname, '..', 'data', 'rexus_settings.json');
function read() { try { return JSON.parse(fs.readFileSync(NORE_FILE, 'utf8')); } catch { return {}; } }
function write(d) { fs.writeFileSync(NORE_FILE, JSON.stringify(d, null, 2)); }

const SECURITY_LEVELS = {
  high: { name: 'Высшая', emoji: '🔴', desc: 'Строгий режим: ссылки, фото, стикеры запрещены' },
  medium: { name: 'Средняя', emoji: '🟡', desc: 'Баланс: ссылки и фото под контролем' },
  normal: { name: 'Нормальная', emoji: '🟢', desc: 'Обычный режим: только антифлуд' }
};

const LOAD_MODES = {
  high: 'Большая нагрузка',
  normal: 'Обычная',
  low: 'Низкая'
};

function renderStatus(peerId, s) {
  const policy = SECURITY_LEVELS[s.security] || SECURITY_LEVELS.normal;
  return [
    '⚙️ Rexus Enterprise — настройка беседы',
    '',
    `${policy.emoji} Безопасность: ${policy.name}`,
    `📦 Нагрузка: ${LOAD_MODES[s.load] || s.load}`,
    `🧠 Умный помощник: ${s.assistant ? 'включён' : 'выключен'}`,
    `🕶 Скрытая беседа: ${s.hidden ? 'включена' : 'выключена'}`,
    `🔗 Объединённые беседы: ${(s.linked || []).join(', ') || 'нет'}`,
    '',
    'Команды:',
    '• /rexus security high/medium/normal — безопасность',
    '• /rexus load high/normal/low — нагрузка',
    '• /rexus assistant on/off — умный помощник',
    '• /rexus hide on/off — скрыть беседу',
    '• /rexus link add/del/sync [ID] — объединение',
    '• /rexus status — статус'
  ].join('\n');
}

module.exports = {
  command: '/rexus',
  aliases: ['/дрим', '/dREAM', '/rexusenterprise'],
  description: 'Rexus Enterprise — управление беседой',
  async execute(context) {
    const { peerId, senderId, text } = context;
    const parts = String(text || '').trim().split(/\s+/);
    const cmd = (parts[1] || 'status').toLowerCase();
    const settings = read();
    if (!settings[peerId]) settings[peerId] = { security: 'normal', hidden: false, assistant: true, load: 'normal', linked: [] };
    const s = settings[peerId];

    if (cmd === 'status') return context.reply(renderStatus(peerId, s));

    if (cmd === 'security') {
      const level = parts[2]?.toLowerCase();
      if (!['high', 'medium', 'normal'].includes(level)) return context.reply('❌ high/medium/normal');
      s.security = level;
      write(settings);
      const policy = SECURITY_LEVELS[level];
      return context.reply(`${policy.emoji} Безопасность: ${policy.name}\n${policy.desc}`);
    }

    if (cmd === 'load') {
      const level = parts[2]?.toLowerCase();
      if (!['high', 'normal', 'low'].includes(level)) return context.reply('❌ high/normal/low');
      s.load = level;
      write(settings);
      return context.reply(`📦 Нагрузка: ${LOAD_MODES[level]}`);
    }

    if (cmd === 'assistant') {
      s.assistant = parts[2] === 'on';
      write(settings);
      return context.reply(`🧠 Умный помощник: ${s.assistant ? 'включён' : 'выключен'}`);
    }

    if (cmd === 'hide') {
      s.hidden = parts[2] === 'on';
      write(settings);
      return context.reply(`🕶 Беседа ${s.hidden ? 'скрыта' : 'открыта'}.`);
    }

    if (cmd === 'link') {
      const action = parts[2];
      const target = parts[3];
      if (action === 'add' && target) {
        if (!s.linked.includes(target)) s.linked.push(target);
        write(settings);
        return context.reply(`🔗 Беседа ${target} добавлена.`);
      }
      if (action === 'del' && target) {
        s.linked = s.linked.filter(id => id !== target);
        write(settings);
        return context.reply(`🔗 Беседа ${target} удалена.`);
      }
      if (action === 'sync' && target) {
        settings[target] = { ...s, linked: [] };
        write(settings);
        return context.reply(`✅ Настройки скопированы в ${target}.`);
      }
      return context.reply('❌ /rexus link add/del/sync [ID]');
    }

    return context.reply(renderStatus(peerId, s));
  }
};
