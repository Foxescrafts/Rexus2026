const { checkSysAccess } = require('./sysadmin.js');

module.exports = {
  command: '/health',
  aliases: ['/здоровье'],
  description: 'Статус бота',
  async execute(context) {
    const access = await checkSysAccess(context.senderId);
    if (access < 1) return context.reply('⛔ Только для агентов.');

    const mem = process.memoryUsage();
    const uptime = Math.floor(process.uptime());
    const lines = [
      '💚 Health-check',
      `⏱ Uptime: ${Math.floor(uptime / 3600)}ч ${Math.floor((uptime % 3600) / 60)}м`,
      `💾 Heap: ${Math.round(mem.heapUsed / 1024 / 1024)} / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      `📋 PID: ${process.pid}`,
    ];
    return context.reply(lines.join('\n'));
  }
};
