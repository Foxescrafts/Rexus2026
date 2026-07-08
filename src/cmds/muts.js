const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const { hasCommandAccess, getAccessDeniedMessage } = require('../utils/commandAccess.js');
const { extractNumericId } = require('./ban.js');
const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

const MUTES_FILE = path.join(__dirname, '..', 'data', 'global_mutes.json');

function readMutes() { try { return JSON.parse(fs.readFileSync(MUTES_FILE, 'utf8')); } catch { return {}; } }
function writeMutes(data) { fs.writeFileSync(MUTES_FILE, JSON.stringify(data, null, 2)); }

function parseTime(timeString) {
  const val = parseInt(timeString);
  if (isNaN(val) || val <= 0) return null;
  const unit = timeString.slice(-1).toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  switch (unit) {
    case 'с': return now + val;
    case 'м': return now + val * 60;
    case 'ч': return now + val * 3600;
    case 'д': return now + val * 86400;
    case 'н': return now + val * 604800;
    case 'г': return now + val * 31536000;
    default: return now + val * 60;
  }
}

function formatTime(seconds) {
  if (seconds <= 0) return 'истекло';
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  return `${d ? d + 'д ' : ''}${h ? h + 'ч ' : ''}${m ? m + 'м' : ''}`.trim();
}

module.exports = {
  command: '/muts',
  aliases: ['/глобалмут', '/гм'],
  description: 'Глобальный мут пользователя',
  async execute(context) {
    try {
      const hasAccess = await hasCommandAccess(context.senderId, 'muts');
      if (!hasAccess) return context.reply(getAccessDeniedMessage('muts'));

      const args = context.text.split(' ');
      if (args.length < 3) return context.reply('❌ /muts [ID] [время] [причина]\nПример: /muts @user 30м Спам\nФорматы: 30с, 15м, 2ч, 7д, 1н, 1г');

      const userId = await extractNumericId(args[1]);
      if (!userId) return context.reply('❌ Не удалось определить ID');
      if (parseInt(userId) === parseInt(context.senderId)) return context.reply('❌ Нельзя замутить себя');

      const targetAccess = await checkSysAccess(userId);
      const senderAccess = await checkSysAccess(context.senderId);
      if (targetAccess >= senderAccess && targetAccess > 0) return context.reply(`❌ Нельзя замутить пользователя с уровнем "${getAccessLevelName(targetAccess)}"`);

      const mutedUntil = parseTime(args[2]);
      if (!mutedUntil) return context.reply('❌ Неверный формат времени (30м, 2ч, 1д)');

      const reason = args.slice(3).join(' ') || 'Не указана';
      const now = Math.floor(Date.now() / 1000);

      const mutes = readMutes();
      if (mutes[userId] && mutes[userId].muted_until > now) {
        const rem = mutes[userId].muted_until - now;
        return context.reply(`⚠️ Уже в муте!\n🕒 Осталось: ${formatTime(rem)}\n📝 Причина: ${mutes[userId].reason}`);
      }

      mutes[userId] = { muted_by: context.senderId, muted_at: now, muted_until: mutedUntil, reason };
      writeMutes(mutes);

      let userDisplay = `[id${userId}|Пользователь]`;
      try { const u = await vk.api.users.get({ user_ids: [userId] }); if (u[0]) userDisplay = `[id${userId}|${u[0].first_name} ${u[0].last_name}]`; } catch {}

      const duration = formatTime(mutedUntil - now);
      context.send(`🔇 ГЛОБАЛЬНЫЙ МУТ\n👤 ${userDisplay}\n⏱ ${duration}\n📝 ${reason}`);

      try { await vk.api.messages.send({ user_id: userId, message: `⚠️ Вам выдан глобальный мут.\n⏱ ${duration}\n📝 ${reason}`, random_id: Date.now() }); } catch {}
    } catch (error) {
      console.error('[MUTS]', error);
      context.reply('❌ Ошибка');
    }
  }
};
