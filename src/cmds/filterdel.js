const { checkIfTableExists, getUserRole, getRoleName } = require('./roles.js');
const { checkCommandPriority, getCommandPriorities } = require('./editcmd.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: '/filterdel',
    aliases: ['/фильтрудалить'],
    description: 'Удалить запрещённое слово',
    async execute(context) {
        const { peerId, senderId, text } = context;
        const parts = text.split(' ');
        const word = parts.slice(1).join(' ').toLowerCase();

        if (!await checkIfTableExists(`roles_${peerId}`)) {
            return context.send('⚠️ Беседа не активирована');
        }

        const hasPermission = await checkCommandPriority(peerId, senderId, '/filterdel');
        if (!hasPermission) {
            const priorities = await getCommandPriorities(peerId);
            const requiredRole = priorities['/filterdel'] || 60;
            const senderRole = await getUserRole(peerId, senderId);
            const senderRoleName = await getRoleName(peerId, senderRole);
            return context.reply(`⛔ Доступ запрещён | Требуется приоритет ${requiredRole} или выше\n👤 Ваша роль: ${senderRoleName}`);
        }

        if (!word) {
            return context.reply('❌ Использование: /filterdel [слово или фраза]');
        }

        const file = path.join(__dirname, '..', 'data', `filters_${peerId}.json`);
        let filters = [];
        try {
            if (fs.existsSync(file)) filters = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (e) {}

        const filtered = filters.filter(f => f.word !== word);
        fs.writeFileSync(file, JSON.stringify(filtered, null, 2));
        context.send(`✅ Запрещённое слово "${word}" удалено.`);
    }
};
