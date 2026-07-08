const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const { extractNumericId } = require('./ban.js');
const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

const MUTES_FILE = path.join(__dirname, '..', 'data', 'global_mutes.json');
function readMutes() { try { return JSON.parse(fs.readFileSync(MUTES_FILE, 'utf8')); } catch { return {}; } }
function writeMutes(data) { fs.writeFileSync(MUTES_FILE, JSON.stringify(data, null, 2)); }

module.exports = {
  command: '/unmuts',
  aliases: ['/размут', '/снятьмут'],
  description: 'Снять глобальный мут',
  async execute(context) {
    try {
      const args = context.text.split(' ');
      if (args.length < 2) return context.reply('❌ /unmuts [ID]');

      const userId = await extractNumericId(args[1]);
      if (!userId) return context.reply('❌ Не удалось определить ID');

      const mutes = readMutes();
      if (!mutes[userId]) return context.reply('❌ Пользователь не в муте');

      const muteInfo = mutes[userId];
      const senderAccess = await checkSysAccess(context.senderId);
      if (muteInfo.muted_by !== context.senderId) {
        const targetAccess = await checkSysAccess(muteInfo.muted_by);
        if (targetAccess >= senderAccess) return context.reply(`❌ Нельзя снять мут от "${getAccessLevelName(targetAccess)}"`);
      }

      delete mutes[userId];
      writeMutes(mutes);

      let userDisplay = `[id${userId}|Пользователь]`;
      try { const u = await vk.api.users.get({ user_ids: [userId] }); if (u[0]) userDisplay = `[id${userId}|${u[0].first_name} ${u[0].last_name}]`; } catch {}

      context.send(`🔈 Глобальный мут снят\n👤 ${userDisplay}`);

      try { await vk.api.messages.send({ user_id: userId, message: '✅ С вас снят глобальный мут. Можете снова писать.', random_id: Date.now() }); } catch {}
    } catch (error) {
      console.error('[UNMUTS]', error);
      context.reply('❌ Ошибка');
    }
  }
};
