const database = require('../databases.js');
const { checkUserRole, checkIfTableExists } = require('../util.js');

module.exports = {
  command: '/nlist',
  aliases: ['/nlist'],
  description: 'Отображение списка никнеймов',
  async execute(context) {
    const conferenceId = context.peerId;

    if (!await checkIfTableExists(`nicknames_${conferenceId}`)) {
      return context.send('⚠️ Беседа не активирована | Для активации используйте команду /start');
    }

    const selectNicknamesQuery = `SELECT user_id, nickname FROM nicknames_${conferenceId}`;

    database.query(selectNicknamesQuery, async (error, results) => {
      if (error) {
        console.error('Ошибка:', error);
        return context.send('❌ Ошибка системы');
      }

      if (!results || results.length === 0) {
        return context.send('Пользователей с никами не найдено.');
      }

      const userIds = results.map(n => n.user_id);
      const userInfos = await vk.api.users.get({ user_ids: userIds });
      const userMap = {};
      for (const u of userInfos) userMap[u.id] = u;

      let text = '👥 Список пользователей с никами:\n\n';
      let i = 1;
      for (const item of results) {
        const u = userMap[item.user_id];
        if (u) {
          text += `${i}. [https://vk.com/id${u.id}|${u.first_name} ${u.last_name}] — ${item.nickname}\n`;
        } else {
          text += `${i}. [https://vk.com/id${item.user_id}|Пользователь] — ${item.nickname}\n`;
        }
        i++;
      }
      context.reply(text);
    });
  },
};
