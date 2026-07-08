const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

const SYSCHAT_FILE = path.join(__dirname, '..', 'data', 'syschats.json');
function read() { try { return JSON.parse(fs.readFileSync(SYSCHAT_FILE, 'utf8')); } catch { return {}; } }
function write(d) { fs.writeFileSync(SYSCHAT_FILE, JSON.stringify(d, null, 2)); }

module.exports = {
  command: '/sysbeseda',
  aliases: ['/сисбеседа', '/системнаябеседа'],
  description: 'Сделать беседу системной системная беседа',
  async execute(context) {
    const access = await checkSysAccess(context.senderId);
    if (access < 4) return context.reply(`⛔ Требуется Основатель+. Ваш уровень: ${getAccessLevelName(access)} (${access})`);

    const { peerId } = context;
    if (peerId < 2000000000) return context.reply('Только в беседе.');

    const parts = String(context.text || '').trim().split(/\s+/);
    const sub = (parts[1] || 'status').toLowerCase();
    const chats = read();

    if (sub === 'on' || sub === 'вкл') {
      chats[peerId] = { type: 'system', minAccess: 1, updatedBy: context.senderId, updatedAt: Date.now() };
      write(chats);
      return context.reply(`✅ Беседа ${peerId} теперь системная.`);
    }

    if (sub === 'off' || sub === 'выкл') {
      delete chats[peerId];
      write(chats);
      return context.reply('✅ Беседа больше не системная.');
    }

    if (sub === 'list' || sub === 'список') {
      const keys = Object.keys(chats);
      if (!keys.length) return context.reply('Нет системных бесед.');
      return context.reply('Системные беседы:\n' + keys.join('\n'));
    }

    if (sub === 'status') {
      return context.reply(chats[peerId] ? '✅ Эта беседа системная.' : '❌ Не системная. /sysbeseda on');
    }

    return context.reply('/sysbeseda on/off/list/status');
  }
};
