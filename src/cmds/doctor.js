const os = require('os');

module.exports = {
  command: '/doctor',
  aliases: ['/диагностика', '/ботдоктор'],
  description: 'Диагностика бота',
  async execute(context) {
    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const lines = [
      '🩺 Диагностика Rexus Manager',
      '',
      '⚙ Система:',
      `• Node.js: ${process.version}`,
      `• Платформа: ${process.platform} ${process.arch}`,
      `• Аптайм: ${Math.floor(uptimeSec / 3600)}ч ${Math.floor((uptimeSec % 3600) / 60)}м`,
      '',
      '💾 Память:',
      `• RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`,
      `• Heap: ${Math.round(mem.heapUsed / 1024 / 1024)} / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      `• CPU: ${os.cpus()?.[0]?.model || 'unknown'}`,
      '',
      '📋 Команды:',
      `• Загружено: ${global.commands?.length || 'много'}`,
    ];
    return context.reply(lines.join('\n'));
  }
};
