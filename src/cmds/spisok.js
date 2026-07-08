const { getUserRole, checkIfTableExists, getAllCustomRoles } = require('./roles.js');

module.exports = {
  command: '/roles',
  aliases: ['/roles', '/роли', '/Роли'],
  description: 'Список доступных ролей',
  async execute(context) {
    const senderRoleId = await getUserRole(context.peerId, context.senderId);
    if (!await checkIfTableExists('roles_' + context.peerId)) return context.reply('❌ Таблица ролей не существует');
    if (senderRoleId < 20) return context.reply('❌ У вас нет прав');

    try {
      const customRoles = (await getAllCustomRoles(context.peerId)) || [];
      const allRoles = [
        { id: 20, name: 'Модератор' },
        { id: 40, name: 'Администратор' },
        { id: 60, name: 'Спец. Администратор' },
        { id: 80, name: 'Руководитель' },
        { id: 100, name: 'Владелец' }
      ];

      // Заменяем стандартные названия на кастомные если есть
      const roleMap = {};
      for (const r of allRoles) roleMap[r.id] = r.name;
      for (const c of customRoles) {
        if (c.role_name && c.role_name.trim()) roleMap[c.role_id] = c.role_name;
      }

      let message = '📋 Список ролей (по приоритету):\n\n';
      const sorted = Object.entries(roleMap).sort((a, b) => Number(a[0]) - Number(b[0]));
      for (const [id, name] of sorted) {
        message += `• ${name} (приоритет: ${id})\n`;
      }

      context.reply(message);
    } catch (error) {
      console.error('Ошибка:', error);
      context.reply('❌ Произошла ошибка');
    }
  }
};
