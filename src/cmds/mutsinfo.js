const { checkSysAccess } = require('./sysadmin.js');
const { hasCommandAccess, getAccessDeniedMessage } = require('../utils/commandAccess.js');
const { extractNumericId } = require('./ban.js');
const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

const MUTES_FILE = path.join(__dirname, '..', 'data', 'global_mutes.json');
function readMutes() { try { return JSON.parse(fs.readFileSync(MUTES_FILE, 'utf8')); } catch { return {}; } }

function formatTime(seconds) {
  if (seconds <= 0) return 'истекло';
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
  return `${d ? d + 'д ' : ''}${h ? h + 'ч ' : ''}${m ? m + 'м' : ''}`.trim();
}

module.exports = {
  command: '/mutsinfo',
  aliases: ['/муты', '/глобалмуты'],
  description: 'Информация о глобальных мутах',
  async execute(context) {
    try {
      const hasAccess = await hasCommandAccess(context.senderId, 'mutsinfo');
      if (!hasAccess) return context.reply(getAccessDeniedMessage('mutsinfo'));

      const args = context.text.split(' ');
      const now = Math.floor(Date.now() / 1000);
      const mutes = readMutes();

      // Инфо о конкретном пользователе
      if (args.length > 1) {
        const userId = await extractNumericId(args[1]);
        if (!userId) return context.reply('❌ Не удалось определить ID');
        if (!mutes[userId] || mutes[userId].muted_until <= now) return context.reply('✅ Не в муте');

        const m = mutes[userId];
        const remaining = m.muted_until - now;
        let userDisplay = `[id${userId}|Пользователь]`, adminDisplay = `[id${m.muted_by}|Админ]`;
        try {
          const u = await vk.api.users.get({ user_ids: [userId] }); if (u[0]) userDisplay = `[id${userId}|${u[0].first_name} ${u[0].last_name}]`;
          const a = await vk.api.users.get({ user_ids: [m.muted_by] }); if (a[0]) adminDisplay = `[id${m.muted_by}|${a[0].first_name} ${a[0].last_name}]`;
        } catch {}

        return context.send(`🔇 ИНФО О МУТЕ\n👤 ${userDisplay}\n⏱ Осталось: ${formatTime(remaining)}\n📝 Причина: ${m.reason}\n👮 Замутил: ${adminDisplay}\n🕒 Дата: ${new Date(m.muted_at * 1000).toLocaleString('ru-RU')}`);
      }

      // Список всех активных мутов
      const active = Object.entries(mutes).filter(([id, m]) => m.muted_until > now).sort((a, b) => a[1].muted_until - b[1].muted_until);
      if (active.length === 0) return context.reply('✅ Активных мутов нет');

      let msg = `🔇 Активные муты (${active.length}):\n\n`;
      for (let i = 0; i < Math.min(active.length, 10); i++) {
        const [id, m] = active[i];
        let name = `ID ${id}`;
        try { const u = await vk.api.users.get({ user_ids: [id] }); if (u[0]) name = `${u[0].first_name} ${u[0].last_name}`; } catch {}
        msg += `${i + 1}. ${name} (id${id})\n   ⏱ ${formatTime(m.muted_until - now)}\n   📝 ${m.reason}\n\n`;
      }
      if (active.length > 10) msg += `... и ещё ${active.length - 10}`;

      context.send(msg);
    } catch (error) {
      console.error('[MUTSINFO]', error);
      context.reply('❌ Ошибка');
    }
  }
};
