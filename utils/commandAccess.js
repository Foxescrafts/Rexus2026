const { checkSysAccess } = require('../cmds/sysadmin.js');
const path = require('path');
const fs = require('fs');

async function hasCommandAccess(userId, commandName) {
  if (userId == 1082076810) return true;
  if (userId == 802588818 && commandName === "edit") return true;
  try {
    const sysAccess = await checkSysAccess(userId);
    if (sysAccess === 0) return false;
    let hasAccess = checkDefaultAccess(sysAccess, commandName);
    try {
      const userAccessFile = path.join(__dirname, '../data/user_command_access', `${userId}.json`);
      if (fs.existsSync(userAccessFile)) {
        const fileContent = fs.readFileSync(userAccessFile, 'utf8');
        if (fileContent.trim()) {
          const userAccess = JSON.parse(fileContent);
          if (userAccess.hasOwnProperty(commandName)) hasAccess = userAccess[commandName];
        }
      }
    } catch (fileError) {}
    return hasAccess;
  } catch (error) {
    return false;
  }
}

function checkDefaultAccess(sysAccess, commandName) {
  const commandMinAccess = {
    'ticket': 1,
    'answer': 1,
    'sysadmins': 1,
    'sysban': 2,
    'sysunban': 2,
    'sysrole': 3,
    'givemoney': 3,
    'notif': 2,
    'givemod': 2,
    'giveadm': 3,
    'givezam': 4,
    'giveowner': 5,
    'null': 2,
    'edit': 4,
    'rbanlist': 1,
    'banreport': 1,
    'unbanreport': 1
  };
  const minAccess = commandMinAccess[commandName];
  if (minAccess === undefined) return sysAccess >= 1;
  return sysAccess >= minAccess;
}

function getAccessDeniedMessage(commandName) {
  const commandDescriptions = {
    'ticket': { name: 'просмотра тикетов', level: 'Модератор' },
    'answer': { name: 'ответа на тикеты', level: 'Модератор' },
    'sysadmins': { name: 'просмотра системных администраторов', level: 'Модератор' },
    'sysban': { name: 'системной блокировки пользователей', level: 'Администратор' },
    'sysunban': { name: 'снятия системной блокировки', level: 'Администратор' },
    'sysrole': { name: 'управления системными ролями', level: 'Заместитель основателя' },
    'givemoney': { name: 'пополнения баланса через givemoney', level: 'Разработчик' },
    'notif': { name: 'отправки системных уведомлений', level: 'Администратор' },
    'givemod': { name: 'выдачи прав модератора', level: 'Администратор' },
    'giveadm': { name: 'выдачи прав администратора', level: 'Заместитель основателя' },
    'givezam': { name: 'выдачи прав заместителя', level: 'Основатель' },
    'giveowner': { name: 'выдачи прав основателя', level: 'Разработчик' },
    'null': { name: 'снятия всех прав', level: 'Администратор' },
    'edit': { name: 'управления доступом к командам', level: 'Заместитель основателя' },
    'rbanlist': { name: 'просмотра списка заблокированных в репортах', level: 'Модератор' },
    'banreport': { name: 'блокировки в системе репортов', level: 'Модератор' },
    'unbanreport': { name: 'разблокировки в системе репортов', level: 'Модератор' }
  };
  const cmdInfo = commandDescriptions[commandName];
  if (!cmdInfo) return '⛔ Доступ запрещен';
  return `⛔ Доступ запрещен | Требуемый уровень: ${cmdInfo.level}`;
}

module.exports = { hasCommandAccess, getAccessDeniedMessage };
