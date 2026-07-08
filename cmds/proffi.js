const { checkCommandPriority } = require('./editcmd.js');

module.exports = {
  command: '/proffi',
  aliases: ['/proffi on', '/proffi off'],
  description: 'Режим "только команды" — запрещает обычные сообщения',
  async execute(context) {
    const { peerId, senderId, text } = context;
    const hasAccess = await checkCommandPriority(peerId, senderId, '/proffi');
    if (!hasAccess) return context.reply('⛔ Только для администраторов.');

    const parts = String(text || '').trim().split(/\s+/);
    const action = parts[1] || 'status';

    if (action === 'status' || action === 'статус') {
      return context.reply(`🎛 Profi-режим: ${global.proffiMode?.[peerId] ? 'включён' : 'выключен'}`);
    }

    if (action === 'on' || action === 'вкл') {
      if (!global.proffiMode) global.proffiMode = {};
      global.proffiMode[peerId] = true;
      return context.reply('✅ Profi-режим включён. Только команды чат-менеджера доступны.');
    }

    if (action === 'off' || action === 'выкл') {
      if (global.proffiMode) global.proffiMode[peerId] = false;
      return context.reply('✅ Profi-режим выключен.');
    }

    return context.reply('❌ /proffi on/off/status');
  }
};
