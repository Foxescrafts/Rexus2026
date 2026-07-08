const { checkIfTableExists, getUserRole, getRoleName } = require('./roles.js');
const { checkCommandPriority, getCommandPriorities } = require('./editcmd.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: '/filteredit',
    aliases: ['/фильтрредактировать'],
    description: 'Изменить наказание за слово',
    async execute(context) {
        const { peerId, senderId, text } = context;
        const parts = text.split(' ');
        const type = parts[parts.length - 1];
        const word = parts.slice(1, -1).join(' ').toLowerCase();

        if (!await checkIfTableExists(`roles_${peerId}`)) {
            return context.send('⚠️ Беседа не активирована');
        }

        const hasPermission = await checkCommandPriority(peerId, senderId, '/filteredit');
        if (!hasPermission) {
            const priorities = await getCommandPriorities(peerId);
            const requiredRole = priorities['/filteredit'] || 60;
            const senderRole = await getUserRole(peerId, senderId);
            const senderRoleName = await getRoleName(peerId, senderRole);
            return context.reply(`⛔ Доступ запрещён | Требуется приоритет ${requiredRole} или выше\n👤 Ваша роль: ${senderRoleName}`);
        }

        const typeNum = type === 'исключать' || type === 'kick' ? 1 : type === 'удалять' || type === 'delete' ? 2 : type === 'предупреждать' || type === 'warn' ? 3 : parseInt(type);
        if (![1,2,3].includes(typeNum)) {
            return context.reply('❌ Тип: 1-исключать, 2-удалять, 3-предупреждать');
        }

        if (!word) {
            return context.reply('❌ Использование: /filteredit [слово] [тип]');
        }

        const file = path.join(__dirname, '..', 'data', `filters_${peerId}.json`);
        let filters = [];
        try {
            if (fs.existsSync(file)) filters = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (e) {}

        const found = filters.find(f => f.word === word);
        if (found) {
            found.type = typeNum;
            fs.writeFileSync(file, JSON.stringify(filters, null, 2));
            const names = {1:'исключать', 2:'удалять', 3:'предупреждать'};
            context.send(`✅ Для "${word}" установлено: ${names[typeNum]}.`);
        } else {
            context.send(`❌ Слово "${word}" не найдено.`);
        }
    }
};
