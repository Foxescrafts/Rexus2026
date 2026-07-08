const { checkUserRole, checkIfTableExists, getUserRole, getRoleName } = require('./roles.js');
const { checkCommandPriority, getCommandPriorities } = require('./editcmd.js');
const { vk } = require('../index.js');
const { getlink } = require('../util.js');
const { Keyboard } = require('vk-io');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '..', 'data', 'zov_cache.json');

function readCache() {
    try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; }
}
function writeCache(data) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
}

module.exports = {
    command: '/zov',
    aliases: ['/зов', '/вызов'],
    description: 'Вызов участников беседы',
    async execute(context) {
    if (!global.zovCooldown) global.zovCooldown = {};
    if (global.zovCooldown[context.senderId] && Date.now() - global.zovCooldown[context.senderId] < 5000) return;
    global.zovCooldown[context.senderId] = Date.now();
        const messageText = context.text;
        const { peerId, senderId } = context;
        const parts = messageText.split(' ');
        const reason = parts.slice(1).join(' ');

        if (reason.length === 0) {
            return context.reply('❌ Использование: /zov [текст]');
        }

        if (!await checkIfTableExists(`nicknames_${peerId}`)) {
            return context.send('Ваша беседа не зарегистрирована!');
        }

        const hasPermission = await checkCommandPriority(peerId, senderId, '/zov');
        if (!hasPermission) {
            const priorities = await getCommandPriorities(peerId);
            const requiredRole = priorities['/zov'] || 20;
            const senderRole = await getUserRole(peerId, senderId);
            const senderRoleName = await getRoleName(peerId, senderRole);
            return context.reply(`⛔ Доступ запрещён | Требуется приоритет ${requiredRole} или выше\n👤 Ваша роль: ${senderRoleName} (приоритет ${senderRole})`);
        }

        const cache = readCache();
        cache[`${peerId}_${senderId}`] = reason;
        writeCache(cache);

        const keyboard = Keyboard.builder()
            .callbackButton({ label: 'Все', payload: { cmd: 'zov', type: 'all' }, color: Keyboard.SECONDARY_COLOR })
            .callbackButton({ label: 'Без роли', payload: { cmd: 'zov', type: 'user' }, color: Keyboard.POSITIVE_COLOR })
            .callbackButton({ label: 'С ролью', payload: { cmd: 'zov', type: 'roles' }, color: Keyboard.POSITIVE_COLOR })
            .inline();

        context.reply('Выберите, кого оповестить:', { keyboard });
    }
};

module.exports.handleZovCallback = async function(context) {
    if (!global.zovBtnCooldown) global.zovBtnCooldown = {};
    if (global.zovBtnCooldown[userId] && Date.now() - global.zovBtnCooldown[userId] < 5000) return true;
    global.zovBtnCooldown[userId] = Date.now();
    const { peerId, userId, eventPayload } = context;
    
    if (!eventPayload || eventPayload.cmd !== 'zov') return false;
    
    const cache = readCache();
    const reason = cache[`${peerId}_${userId}`];
    if (!reason) {
        await context.send('❌ Текст вызова утерян. Используйте /zov [текст] заново.');
        return true;
    }
    delete cache[`${peerId}_${userId}`];
    writeCache(cache);
    
    const conversationMembers = await vk.api.messages.getConversationMembers({ peer_id: peerId });
    const memberProfiles = conversationMembers.profiles;
    const senderLink = await getlink(userId);
    
    let targetMembers = [];
    const type = eventPayload.type;
    
    if (type === 'all') {
        targetMembers = memberProfiles;
    } else if (type === 'user') {
        for (const m of memberProfiles) {
            const role = await getUserRole(peerId, m.id);
            if (role === 0) targetMembers.push(m);
        }
    } else if (type === 'roles') {
        for (const m of memberProfiles) {
            const role = await getUserRole(peerId, m.id);
            if (role > 0) targetMembers.push(m);
        }
    }
    
    if (targetMembers.length === 0) {
        await context.send('Нет пользователей для оповещения.');
        return true;
    }
    
    const chunkSize = 80;
    let first = true;
    
    for (let i = 0; i < targetMembers.length; i += chunkSize) {
        const chunk = targetMembers.slice(i, i + chunkSize);
        let mentions = '';
        for (const member of chunk) {
            mentions += `[id${member.id}| ] `;
        }
        
        if (first) {
            await context.send(`🔊 ${senderLink}: ${reason}\n${mentions}`);
            first = false;
        } else {
            await context.send(mentions);
        }
        await new Promise(r => setTimeout(r, 300));
    }
    
    return true;
};
