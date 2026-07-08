const database = require('../databases.js');
const { checkIfTableExists } = require('./roles.js');
const { vk } = require('../index.js');
const { Keyboard } = require('vk-io');
const util = require('util');
const queryAsync = util.promisify(database.query).bind(database);

function generateUniqueKey() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

module.exports = {
    command: '/start',
    aliases: ['/активировать', '/старт', '/начать', '/Начать'],
    description: 'Активировать бота в беседе',
    async execute(context) {
        const { peerId, senderId } = context;
        const conferenceId = peerId;

        if (await checkIfTableExists(`conference_${conferenceId}`)) {
            return context.send('⚠️ Конференция уже активна.');
        }

        const members = await vk.api.messages.getConversationMembers({ peer_id: peerId });
        const owner = members.items.find(m => m.is_owner);
        const ownerId = owner ? owner.member_id : senderId;

        const uniqueKey = generateUniqueKey();

        await queryAsync(`CREATE TABLE IF NOT EXISTS conference_${conferenceId} (
            user_id INT PRIMARY KEY,
            messages_count INT DEFAULT 0,
            warns INT DEFAULT 0,
            warns_history TEXT,
            coins INT DEFAULT 0
        )`);
        await queryAsync(`CREATE TABLE IF NOT EXISTS roles_${conferenceId} (
            user_id INT PRIMARY KEY,
            role_id INT DEFAULT 0
        )`);
        await queryAsync(`CREATE TABLE IF NOT EXISTS nicknames_${conferenceId} (
            user_id INT PRIMARY KEY,
            nickname TEXT
        )`);

        await queryAsync(`INSERT INTO conference (peer_id, active, owner_id, uniquekey) VALUES (?, 1, ?, ?) ON CONFLICT(peer_id) DO UPDATE SET active = 1`, [peerId, ownerId, uniqueKey]);
        await queryAsync(`INSERT INTO roles_${conferenceId} (user_id, role_id) VALUES (?, 100)`, [ownerId]);

        for (const m of members.items) {
            if (m.member_id > 0 && m.is_admin && !m.is_owner) {
                await queryAsync(`INSERT INTO roles_${conferenceId} (user_id, role_id) VALUES (?, 80) ON CONFLICT(user_id) DO UPDATE SET role_id = 80`, [m.member_id]);
            }
        }

        const keyboard = Keyboard.builder()
            .callbackButton({ label: 'НАСТРОИТЬ', payload: { event_id: 7770 }, color: Keyboard.POSITIVE_COLOR })
            .inline();

        context.send('✅ Конференция активирована! Бот готов к работе.\n\nВладелец получил права.\nАдминистраторам чата присвоена роль руководителя.\n\nНажмите «НАСТРОИТЬ» для настройки.', { keyboard });
    }
};
