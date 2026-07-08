const database = require('../databases.js');
const { getUserRole, getRoleName, checkIfTableExists } = require('./roles.js');
const { getlink } = require('../util.js');
const util = require('util');
const queryAsync = util.promisify(database.query).bind(database);

module.exports = {
  command: '/stats',
  aliases: ['/стата', '/статистика', '/statistic', '/getstats'],
  description: 'Информация о пользователе',
  async execute(context) {
    const { peerId, senderId, text, replyMessage } = context;
    const args = text.split(' ');
    let target = replyMessage ? replyMessage.senderId : (args[1] || senderId);

    if (typeof target === 'string') {
      const mm = target.match(/\[id(\d+)\|/); if (mm) target = mm[1];
      else if (target.startsWith('@')) {
        try { const users = await require('../index.js').vk.api.users.get({ user_ids: [target.substring(1)] }); if (users && users[0]) target = users[0].id; } catch {}
      }
    }
    target = parseInt(target);
    if (!target || target === 0) return context.reply('Не удалось найти информацию.');

    let member = await queryAsync(`SELECT * FROM conference_${peerId} WHERE user_id = ?`, [target]);
    member = member.filter(r => r.user_id == target);
    if (!member || member.length === 0) {
      await queryAsync(`INSERT INTO conference_${peerId} (user_id, messages_count, warns, date_reg) VALUES (?, 0, 0, ?)`, [target, new Date().toISOString()]);
      console.log("INSERT USER:", target, "into conference_"+peerId);
      member = await queryAsync(`SELECT * FROM conference_${peerId} WHERE user_id = ?`, [target]);
    }
    let m = member.find(r => r.user_id == target);
    if (!m) {
      await queryAsync(`INSERT INTO conference_${peerId} (user_id, messages_count, warns, date_reg) VALUES (?, 0, 0, ?)`, [target, new Date().toISOString()]);
      member = await queryAsync(`SELECT * FROM conference_${peerId} WHERE user_id = ?`, [target]);
      m = member.find(r => r.user_id == target) || member[0];
    }

    const role = await getUserRole(peerId, target);
    const status = await getRoleName(peerId, role);
    const warns = (m.warns || 0) + '/3';

    let nickname;
    try {
      const nick = await queryAsync(`SELECT nickname FROM nicknames_${peerId} WHERE user_id = ?`, [target]);
      nickname = (nick && nick[0]) ? nick[0].nickname : '';
    } catch { nickname = ''; }
    if (!nickname) {
      try {
        const u = await require('../index.js').vk.api.users.get({ user_ids: [target] });
        nickname = u[0] ? u[0].first_name + ' ' + u[0].last_name : 'Сообщество';
      } catch { nickname = 'Сообщество'; }
    }

    const mute = (m.mute && m.mute !== '') ? 'есть' : 'нет';
    let dateStr = 'неизвестно';
    if (m.date_reg) {
      try { dateStr = new Date(m.date_reg).toLocaleString('ru-RU', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); } catch {} 
    } else {
      try {
        const firstMsg = await queryAsync(`SELECT MIN(date) as d FROM messages WHERE peer_id = ${peerId} AND from_id = ${target}`);
        if (firstMsg && firstMsg[0] && firstMsg[0].d) {
          dateStr = new Date(firstMsg[0].d).toLocaleString('ru-RU', {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
        }
      } catch {}
    }

    let vipStatus = 'нет', vipTime = '∞';
    try {
      const fs = require('fs'), path = require('path');
      const vf = path.join(__dirname, '..', 'data', 'vip_users', target + '.json');
      if (fs.existsSync(vf)) {
        const v = JSON.parse(fs.readFileSync(vf, 'utf8'));
        const vt = v.vip_type || 1;
        if (v.is_permanent === 1) vipStatus = '— ' + vt;
        else if (v.expiry_date) { vipStatus = '— ' + vt; vipTime = new Date(v.expiry_date).toLocaleString('ru-RU'); }
      }
    } catch {}

    // Системные варны и мут
    let sysWarns = 0, sysMuted = 'нет';
    try {
      const fs = require('fs'), path = require('path');
      const punFile = path.join(__dirname, '..', 'data', 'punishments.json');
      if (fs.existsSync(punFile)) {
        const pun = JSON.parse(fs.readFileSync(punFile, 'utf8'));
        if (pun[peerId] && pun[peerId][target]) sysWarns = pun[peerId][target].filter(p => p.type === 'warn').length;
      }
      const muteFile = path.join(__dirname, '..', 'data', 'global_mutes.json');
      if (fs.existsSync(muteFile)) {
        const mutes = JSON.parse(fs.readFileSync(muteFile, 'utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (mutes[target] && mutes[target].muted_until > now) sysMuted = 'да (до ' + new Date(mutes[target].muted_until * 1000).toLocaleString('ru-RU') + ')';
      }
    } catch {}

    let messages = 0;
    try {
      const mc = m.messages_count;
      if (typeof mc === "number") messages = mc;
      else if (typeof mc === "string" && mc.includes("T")) messages = 0;
      else messages = parseInt(mc) || 0;
    } catch {}
    const nickOne = target < 0 ? '[club' + Math.abs(target) + '|сообществе]' : '[id' + target + '|пользователе]';

    let ticketStats = '';
    try {
      const { checkSysAccess } = require('./sysadmin.js');
      const sa = await checkSysAccess(target);
      if (sa >= 1) {
        const database = require('../databases.js');
        const util = require('util');
        const q = util.promisify(database.query);
        const all = await q('SELECT userid, answers FROM sysadmins');
        const found = all.find(a => a.userid == target);
        if (found) {
          ticketStats = '📊 Рассмотрено тикетов: ' + (found.answers || 0);
          if (found.answers > 0) {
            const avg = (found.marks || 0) / found.answers;
            ticketStats += "\n👽 Средняя оценка ответов: " + avg.toFixed(1) + "/5 ⭐";
          } else {
            ticketStats += "\n👽 Средняя оценка ответов: 0.0/5 ⭐";
          }
        }
      }
    } catch(e) {}
    let helperLine = '';
    try {
      const { checkSysAccess } = require('./sysadmin.js');
      const { getAgentNumber } = require('./agent_counter.js');
      const sysAccess = await checkSysAccess(target);
      if (sysAccess === 1) helperLine = '🐩 Модератор №' + getAgentNumber(target);
      else if (sysAccess === 2) helperLine = '🛡 Администратор №' + getAgentNumber(target);
      else if (sysAccess >= 3) helperLine = '👑 Высший состав';
    } catch {}

    let inviter = '—';
    try { if (m.invited_by && m.invited_by !== '0') inviter = await getlink(parseInt(m.invited_by)); } catch {}

    let marriageLine = '💍 Не состоит в браке';
    try {
      const fs = require('fs'), path = require('path');
      const mf = path.join(__dirname, '..', 'data', 'marriages_' + peerId + '.json');
      if (fs.existsSync(mf)) {
        const marriages = JSON.parse(fs.readFileSync(mf, 'utf8'));
        const marr = marriages.find(m => m.user1 === target || m.user2 === target);
        if (marr) {
          const pid = marr.user1 === target ? marr.user2 : marr.user1;
          marriageLine = '💍 В браке с ' + await getlink(pid);
        }
      }
    } catch {}

    let st = '🔍 Информация о ' + nickOne + ':\n\n🗣 Статус: ' + status + '\n';
    if (helperLine) st += helperLine + '\n';
    if (ticketStats) st += ticketStats + '\n';
    st += '⚠ Предупреждений: ' + warns + '\n📄 Никнейм: ' + nickname + '\n🚧 Блокировка чата: ' + mute + '\n📅 Дата появления в чате: ' + dateStr + '\n\n📋 Глобальная информация:\n💎 VIP статус: ' + vipStatus + '\n💎 Действует до: ' + vipTime + '\n⚠️ Системных варнов: ' + sysWarns + '/3\n🔇 Системный мут: ' + sysMuted + '\n✍ Сообщений отправлено: ' + messages + '\n👫 Пригласил(а): ' + inviter + '\n⚙ ID: ' + target + '\n\n' + marriageLine;
    context.send(st);
  }
};
