const { checkSysAccess } = require('./sysadmin.js');
const { getUserRole, getRoleName, checkIfTableExists } = require('./roles.js');
const { extractNumericId } = require('./ban.js');
const { getlink } = require('../util.js');
const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

const PUNISH_FILE = path.join(__dirname, '..', 'data', 'punishments.json');
function readPun() { try { return JSON.parse(fs.readFileSync(PUNISH_FILE, 'utf8')); } catch { return {}; } }
function writePun(d) { fs.writeFileSync(PUNISH_FILE, JSON.stringify(d, null, 2)); }

function parseTime(s) {
  const v = parseInt(s); if (isNaN(v) || v <= 0) return 1800;
  const u = s.slice(-1).toLowerCase();
  if (u === 'с') return v;
  if (u === 'м') return v * 60;
  if (u === 'ч') return v * 3600;
  if (u === 'д') return v * 86400;
  return v * 60;
}

function fmtTime(s) {
  const m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d) return d + 'д';
  if (h) return h + 'ч';
  return m + 'м';
}

module.exports = {
  command: '/punish',
  aliases: ['/наказание', '/системное'],
  description: 'Системное наказание: warn, mute, kick',
  async execute(context) {
    try {
      const senderAccess = await checkSysAccess(context.senderId);
      if (senderAccess < 1) return context.reply('⛔ Только для агентов.');

      const parts = context.text.split(/\s+/);
      const action = parts[1]?.toLowerCase();
      if (!['warn','mute','kick'].includes(action)) return context.reply('❌ /punish warn/mute/kick [ID] [время] [причина]');

      let targetId = context.replyMessage?.senderId || parts[2];
      if (typeof targetId === 'string') {
        const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
        if (targetId.startsWith('@')) { try { const u = await vk.api.users.get({ user_ids: [targetId.substring(1)] }); if (u[0]) targetId = u[0].id; } catch {} }
      }
      targetId = parseInt(targetId);
      if (!targetId || targetId === context.senderId) return context.reply('❌ Укажите цель.');

      const reason = parts.slice(action === 'mute' ? 4 : 3).join(' ') || 'Не указана';
      const targetLink = await getlink(targetId);
      const adminLink = await getlink(context.senderId);

      if (action === 'warn') {
        const pun = readPun();
        if (!pun[context.peerId]) pun[context.peerId] = {};
        if (!pun[context.peerId][targetId]) pun[context.peerId][targetId] = [];
        pun[context.peerId][targetId].push({ type: 'warn', reason, time: Date.now() });
        writePun(pun);
        const count = pun[context.peerId][targetId].length;
        return context.reply(`⚠️ ${targetLink} получил системное предупреждение ${count}/3 от ${adminLink}.\n📝 ${reason}`);
      }

      if (action === 'mute') {
        const seconds = parseTime(parts[3] || '30м');
        try { await vk.api.messages.changeConversationMemberRestrictions({ peer_id: context.peerId, member_ids: [targetId], for: seconds, action: 'ro' }); } catch {}
        return context.reply(`🔇 ${targetLink} получил системный мут на ${fmtTime(seconds)} от ${adminLink}.\n📝 ${reason}`);
      }

      if (action === 'kick') {
        try { await vk.api.messages.removeChatUser({ chat_id: context.peerId - 2000000000, member_id: targetId }); } catch {}
        return context.reply(`🚪 ${targetLink} исключён системным наказанием от ${adminLink}.\n📝 ${reason}`);
      }
    } catch (error) {
      console.error('[PUNISH]', error);
      return context.reply('❌ Ошибка');
    }
  }
};
