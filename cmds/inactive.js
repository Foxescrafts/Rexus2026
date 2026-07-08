const { getUserRole } = require('./roles.js');
const database = require('../databases.js');
const util = require('util');
const query = util.promisify(database.query);

module.exports = {
  command: '/inactive',
  description: 'Показать неактивных участников',
  async execute(context) {
    const { peerId, senderId } = context;
    const userRole = await getUserRole(peerId, senderId);
    if (userRole < 60) return context.reply('⛔ Требуется Ст. Администратор или выше');

    try {
      const users = await query('SELECT user_id, messages_count FROM conference_' + peerId + ' ORDER BY messages_count ASC LIMIT 10');
      if (!users || users.length === 0) return context.reply('Нет данных.');
      let msg = '🔍 Неактивные:\n';
      for (const u of users) msg += `@id${u.user_id} — ${u.messages_count || 0} сообщ.\n`;
      context.reply(msg);
    } catch(e) { context.reply('Ошибка: ' + e.message); }
  }
};
