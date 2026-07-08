const { checkIfTableExists, getUserRole, getRoleName } = require('./roles.js');
const { getlink } = require('../util.js');
const { Keyboard } = require('vk-io');

module.exports = {
    command: '/owner',
    aliases: ['/владелец'],
    description: 'Передать права владельца',
    async execute(context) {
        const { peerId, senderId, text, replyMessage } = context;
        const parts = text.split(' ');
        let targetId = replyMessage?.senderId || parts[1];

        if (!targetId) {
            return context.reply('❌ Использование: /owner [ID] или ответьте на сообщение');
        }

        targetId = parseInt(targetId);
        if (isNaN(targetId) || targetId <= 0) return context.reply('❌ Некорректный ID');
        if (targetId === senderId) return context.reply('❌ Нельзя передать права самому себе');

        if (!await checkIfTableExists(`roles_${peerId}`)) {
            return context.send('⚠️ Беседа не активирована');
        }

        const senderRole = await getUserRole(peerId, senderId);
        if (senderRole !== 100 && senderRole !== 1000) return;
    if (targetId === 689892907) return context.send("⛔ Этому пользователю запрещено выдавать Владельца.");

        const targetLink = await getlink(targetId);
        const keyboard = Keyboard.builder()
            .callbackButton({ label: 'Передать', payload: { cmd: 'addowner', target: targetId }, color: Keyboard.NEGATIVE_COLOR })
            .inline();

        context.reply(`⚠ Вы хотите добавить владельца в беседе.\n\n🔊 Пользователь ${targetLink} получит полный доступ к управлению.\n\nНажмите кнопку для подтверждения.`, { keyboard });
    }
};

// Добавь этот код в конец owner.js вместо старого handleAddOwner

module.exports.handleAddOwner = async function(context) {
    const { peerId, userId, eventPayload } = context;
    if (!eventPayload || eventPayload.cmd !== 'addowner') return false;

    const targetId = eventPayload.target;
    const fs = require('fs');
    const path = require('path');
    const { getlink } = require('../util.js');
    const { getUserRole } = require('./roles.js');

    const senderRole = await getUserRole(peerId, userId);
    if (senderRole !== 100 && senderRole !== 1000) {
    if (targetId === 689892907) return context.send("⛔ Этому пользователю запрещено выдавать Владельца.");
        await context.send('❌ Только владелец может передать права.');
        return true;
    }

    // Записываем роль цели (Владелец)
    const targetFile = path.join(__dirname, '..', 'data', `roles_${peerId}`, `${targetId}.json`);
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify({ user_id: targetId, role_id: 100 }));

    // Понижаем отправителя до Руководителя
    const senderFile = path.join(__dirname, '..', 'data', `roles_${peerId}`, `${userId}.json`);
    fs.writeFileSync(senderFile, JSON.stringify({ user_id: userId, role_id: 80 }));

    const senderLink = await getlink(userId);
    const targetLink = await getlink(targetId);
    context.send(`👑 ${targetLink} получил права владельца.\nВыдал: ${senderLink}`);
    return true;
};
