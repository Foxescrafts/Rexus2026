const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const vk = require('../vkInstance.js');

module.exports = {
  command: '/sysbrain',
  aliases: ['/мозгбота', '/brain', '/системии'],
  description: 'Системная диагностика в ЛС',
  async execute(context) {
    const access = await checkSysAccess(context.senderId);
    if (access < 5) return context.reply('Это нарушает мою политику.');

    const mem = process.memoryUsage();
    const uptime = Math.floor(process.uptime());
    const report = [
      '🧠 Rexus System Brain',
      '',
      `⚙ Статус: Активен`,
      `⏱ Аптайм: ${Math.floor(uptime / 3600)}ч ${Math.floor((uptime % 3600) / 60)}м`,
      `💾 Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      `📋 Команд: ${global.commands?.length || 'много'}`,
      `🔒 Системный доступ: ${getAccessLevelName(access)} (${access})`,
      '',
      '✅ Система стабильна.'
    ].join('\n');

    try {
      await vk.api.messages.send({ user_id: context.senderId, message: report, random_id: Date.now() });
      context.reply('📨 Отчёт отправлен в ЛС.');
    } catch {
      context.reply(report);
    }
  }
};
