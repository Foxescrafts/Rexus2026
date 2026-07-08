const database = require('../databases.js');
const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const { hasCommandAccess, getAccessDeniedMessage } = require('../utils/commandAccess.js');
const { getUserRole, getRoleName, checkIfTableExists, getAllCustomRoles } = require('./roles.js');
const util = require('util');
const { extractNumericId } = require('./ban.js');
const { getlink } = require('../util.js');
const cacheManager = require('../cacheManager.js');
const databaseQuery = util.promisify(database.query.bind(database));

module.exports = {
  command: '/sysrole',
  description: 'Системная команда для выдачи ролей в беседах',
  async execute(context) {
    try {
      const hasAccess = await hasCommandAccess(context.senderId, 'sysrole');
      if (!hasAccess) {
        return context.reply(getAccessDeniedMessage('sysrole'));
      }

      const senderSysAccess = await checkSysAccess(context.senderId);
      const args = context.text.split(' ');
      const replyMessage = context.replyMessage;

      const standardRoles = [
        { role_id: 0, role_name: 'Участник' },
        { role_id: 20, role_name: 'Модератор' },
        { role_id: 40, role_name: 'Администратор' },
        { role_id: 60, role_name: 'Спец. Администратор' },
        { role_id: 80, role_name: 'Руководитель' },
        { role_id: 100, role_name: 'Владелец' }
      ];

      // Определяем цель: ответ на сообщение или аргумент
      let userId;
      let roleIndex;

      if (replyMessage && replyMessage.senderId) {
        userId = Number(replyMessage.senderId);
        roleIndex = 1;
      } else {
        if (args.length < 3) {
          return context.reply(`❓ Укажите пользователя и роль.\nПримеры:\n/sysrole @user модератор\n/sysrole @user 60\nИли ответьте на сообщение: /sysrole модератор`);
        }
        userId = await extractNumericId(args[1]);
        roleIndex = 2;
      }

      if (userId === 689892907) {
      }
      if (!userId || userId === 0) {
        return context.reply('❌ Некорректный пользователь');
      }
      userId = parseInt(userId);

      const roleIdentifier = args.slice(roleIndex).join(' ').toLowerCase();
      if (!roleIdentifier) {
        return context.reply('❌ Укажите роль');
      }

      const tableExists = await checkIfTableExists(`roles_${context.peerId}`);
      let customRoles = [];
      if (tableExists) {
        customRoles = await getAllCustomRoles(context.peerId);
      }

      let targetRole = null;
      let isCustomRole = false;

      if (customRoles.length > 0) {
        targetRole = customRoles.find(role => role.role_name.toLowerCase() === roleIdentifier);
        if (targetRole) isCustomRole = true;
      }

      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
      if (!targetRole) {
        targetRole = standardRoles.find(role => role.role_name.toLowerCase() === roleIdentifier);
      }

      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
      if (!targetRole) {
        const roleId = parseInt(roleIdentifier);
        if (!isNaN(roleId)) {
          if (customRoles.length > 0) {
            targetRole = customRoles.find(role => role.role_id === roleId);
            if (targetRole) isCustomRole = true;
          }
      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
          if (!targetRole) {
            const standardRole = standardRoles.find(role => role.role_id === roleId);
            if (standardRole) {
              targetRole = standardRole;
            } else {
              targetRole = { role_id: roleId, role_name: `Кастомная роль (${roleId})` };
              isCustomRole = true;
            }
          }
        }
      }

      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
      if (parseInt(roleIdentifier) > 100) {
        return context.reply("❌ Максимальный приоритет роли — 100");
      }
      if (!targetRole) {
        return context.reply(`❌ Неверная роль "${roleIdentifier}"`);
      }

      if (!tableExists) {
        await databaseQuery(`CREATE TABLE IF NOT EXISTS roles_${context.peerId} (user_id BIGINT PRIMARY KEY, role_id INT DEFAULT 0)`);
      }

      const rolesTable = `roles_${context.peerId}`;
      const currentRole = await getUserRole(context.peerId, userId);
      if (currentRole === 1000) return context.reply("⛔ Нельзя изменить роль этому пользователю — он генеральный директор Rexus.");
      await databaseQuery(`INSERT INTO ${rolesTable} (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)`, [userId, targetRole.role_id]);

      const cacheKey = cacheManager.generateKey(context.peerId, userId);
      cacheManager.invalidate('userRoles', cacheKey);

      if (isCustomRole && targetRole.role_name.startsWith('Кастомная роль')) {
        const customRolesTable = `custom_roles_${context.peerId}`;
        await databaseQuery(`CREATE TABLE IF NOT EXISTS ${customRolesTable} (role_id INT PRIMARY KEY, role_name VARCHAR(255))`);
        await databaseQuery(`INSERT INTO ${customRolesTable} (role_id, role_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_name = VALUES(role_name)`, [targetRole.role_id, targetRole.role_name]);
      }

      const userLink = await getlink(userId);
      const adminLink = await getlink(context.senderId);

      let successMessage;
      if (userId !== context.senderId) {
        successMessage = `✅ ${adminLink} выдал роль «${targetRole.role_name}» (приоритет ${targetRole.role_id}) пользователю ${userLink}`;
      } else {
        successMessage = `✅ ${userLink} установил себе роль «${targetRole.role_name}» (приоритет ${targetRole.role_id})`;
      }

      context.send({ message: successMessage, disable_mentions: true });

    } catch (error) {
      console.error('Ошибка в /sysrole:', error);
      context.reply('❌ Произошла ошибка при выполнении команды');
    }
  },
};
