const { getUserRole, getRoleName } = require('./roles.js');
const { vk } = require('../index.js');

const roleEmojis = { 0: '👤', 20: '🛡️', 40: '👑', 60: '⚔️', 80: '🔱', 100: '💎' };
const cache = new Map();

function btn(label, section, color) {
  return { action: { type: 'callback', label, payload: { command: 'help_section', section } }, color: color || 'secondary' };
}

function getMenuButtons(userRole) {
  const buttons = [ [ btn('👤 Основные', 'all') ] ];
  if (userRole >= 20) buttons.push([ btn('🛡 Модератор', 'moder') ]);
  if (userRole >= 40) buttons.push([ btn('👑 Администратор', 'admin', 'primary') ]);
  if (userRole >= 60) buttons.push([ btn('⚔ Ст. Администратор', 'senior', 'primary') ]);
  if (userRole >= 80) buttons.push([ btn('🔱 Руководитель', 'leader', 'positive') ]);
  if (userRole >= 100) buttons.push([ btn('💎 Владелец', 'owner', 'positive') ]);
  return buttons;
}

async function buildMenu(peerId, senderId) {
  const userRole = await getUserRole(peerId, senderId);
  const userRoleName = await getRoleName(peerId, userRole);
  const emoji = roleEmojis[userRole] || '👤';
  const text = `📋 Rexus Manager\n\nВаша роль: ${emoji} ${userRoleName}\n\nВыберите раздел:`;
  const kb = JSON.stringify({ inline: true, buttons: getMenuButtons(userRole) });
  return { text, kb, userRole, userRoleName, emoji };
}

const sections = {
  all: `👤 Основные:\n/help /ping /report /стата /staff /баланс /перевод /работа /брак /развод /крокодил /казино`,
  moder: `🛡 Модератор:\n/kick /ban /unban /warn /unwarn /mute /unmute /banlist /online /logs`,
  admin: `👑 Администратор:\n/addmoder /removerole /silence /правила /приветствие /setnick /rnick /filter /stitle /rtitle`,
  senior: `⚔ Ст. Администратор:\n/antimat /antilink /antispam /clear /inactive  /addspec`,
  leader: `🔱 Руководитель:\n/addadmin /removerole /silence /правила /приветствие /setnick /rnick /filter /antimat /antilink /antispam /clear /inactive  /addspec`,
  owner: `💎 Владелец:\n/settings /owner /addowner /editcmd /clearchat /роль /demote`
};

const backKb = JSON.stringify({ inline: true, buttons: [ [ btn('← Назад', 'main') ] ] });

module.exports = {
  command: '/help',
  aliases: ['/помощь', '/команды', '/h'],
  async execute(context) {
    const { peerId, senderId } = context;
    const menu = await buildMenu(peerId, senderId);
    cache.set(senderId, { ...menu, peerId });
    context.send({ message: menu.text, keyboard: menu.kb });
  },

  async showSection(context, section) {
    const senderId = context.userId || context.senderId;
    const peerId = context.peerId;
    const cached = cache.get(senderId) || {};

    if (context.conversationMessageId && !cached.cmid) {
      cached.cmid = context.conversationMessageId;
      cached.peerId = peerId;
      cache.set(senderId, cached);
    }

    if (section === 'main') {
      const menu = await buildMenu(cached.peerId || peerId, senderId);
      Object.assign(cached, menu);
      cache.set(senderId, cached);
      if (cached.cmid) {
        try { await vk.api.messages.edit({ peer_id: cached.peerId, conversation_message_id: cached.cmid, message: menu.text, keyboard: menu.kb }); return; } catch(e) {}
      }
      context.send({ message: menu.text, keyboard: menu.kb });
      return;
    }

    const text = sections[section] || sections.all;
    if (cached.cmid) {
      try { await vk.api.messages.edit({ peer_id: cached.peerId, conversation_message_id: cached.cmid, message: text, keyboard: backKb }); return; } catch(e) {}
    }
    context.send({ message: text, keyboard: backKb });
  }
};
