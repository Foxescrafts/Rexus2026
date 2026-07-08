const { checkIfTableExists } = require('./roles.js');
const { checkCommandPriority } = require('./editcmd.js');
const { invalidateChatSettings } = require('../optimized_util.js');
const fs = require('fs');
const path = require('path');
const { vk } = require('../index.js');

const FILE = (pid) => path.join(__dirname, '..', 'data', 'conference', `${pid}.json`);
const cache = new Map();

function load(pid) { if (fs.existsSync(FILE(pid))) return JSON.parse(fs.readFileSync(FILE(pid), 'utf8')); return {}; }
function save(pid, s) { fs.writeFileSync(FILE(pid), JSON.stringify(s)); invalidateChatSettings(pid); }

function btn(label, key, on) {
  return { action: { type: 'callback', label, payload: { command: 'settoggle', key } }, color: on ? 'positive' : 'negative' };
}

function buildMenu(peerId) {
  const s = load(peerId);
  const on = (k) => s[k] === 1;
  const text = `⚙ Настройки чата\n\n` +
    `1. Кик при выходе: ${on('kick_leave')?'✅ Вкл':'❌ Выкл'}\n` +
    `2. Стикеры: ${on('stickers')?'❌ Запрещены':'✅ Разрешены'}\n` +
    `3. Ссылки: ${on('links')?'❌ Запрещены':'✅ Разрешены'}\n` +
    `4. Фото: ${on('images')?'❌ Запрещены':'✅ Разрешены'}\n` +
    `5. Видео: ${on('video')?'❌ Запрещены':'✅ Разрешены'}\n` +
    `6. Анти-спам: ${on('spam')?'✅ Вкл':'❌ Выкл'}\n` +
    `7. Задержка: ${s.cooldown||0} сек.`;
  const kb = JSON.stringify({ inline: true, buttons: [
    [ btn('1. Кик при выходе', 'kick_leave', on('kick_leave')), btn('2. Стикеры', 'stickers', on('stickers')) ],
    [ btn('3. Ссылки', 'links', on('links')), btn('4. Фото', 'images', on('images')) ],
    [ btn('5. Видео', 'video', on('video')), btn('6. Анти-спам', 'spam', on('spam')) ],
    [ { action: { type: 'callback', label: '❌ Закрыть', payload: { command: 'settings_close' } }, color: 'negative' } ]
  ]});
  return { text, kb };
}

module.exports = {
  command: '/settings',
  description: 'Настройки беседы',
  async execute(context) {
    const { peerId, senderId } = context;
    if (!await checkIfTableExists(`conference_${peerId}`)) return context.send('❌ /start');
    if (!await checkCommandPriority(peerId, senderId, '/settings')) return context.send('⛔ Нет доступа');

    const parts = context.text.split(' ');
    const keys = ['kick_leave','stickers','links','images','video','spam'];
    if (parts[1] && keys.includes(parts[1])) {
      const s = load(peerId);
      s[parts[1]] = parts[2] === 'toggle' ? (s[parts[1]] ? 0 : 1) : (parseInt(parts[2]) ? 1 : 0);
      save(peerId, s);
    }

    const menu = buildMenu(peerId);
    cache.set(senderId, { ...menu, peerId });
    context.send({ message: menu.text, keyboard: menu.kb });
  },

  async showSection(context) {
    const senderId = context.userId || context.senderId;
    const peerId = context.peerId;
    const cached = cache.get(senderId) || {};

    if (context.conversationMessageId && !cached.cmid) {
      cached.cmid = context.conversationMessageId;
      cached.peerId = peerId;
      cache.set(senderId, cached);
    }

    const key = context.eventPayload?.key;
    if (key) {
      const s = load(peerId);
      s[key] = s[key] ? 0 : 1;
      save(peerId, s);
    }

    const menu = buildMenu(cached.peerId || peerId);
    Object.assign(cached, menu);
    cache.set(senderId, cached);

    if (cached.cmid) {
      try { await vk.api.messages.edit({ peer_id: cached.peerId, conversation_message_id: cached.cmid, message: menu.text, keyboard: menu.kb }); return; } catch(e) {}
    }
    context.send({ message: menu.text, keyboard: menu.kb });
  }
};
