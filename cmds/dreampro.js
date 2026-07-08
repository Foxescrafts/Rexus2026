module.exports = {
  command: '/rexuspro',
  aliases: ['/ботпро', '/диагностикабота'],
  description: 'Системная диагностика Rexus PRO',
  async execute(context) {
    const mem = process.memoryUsage();
    const msg = [
      '🔧 Rexus Manager PRO диагностика',
      '',
      `Статус: ok`,
      `Аптайм: ${Math.floor(process.uptime())}с`,
      `Node.js: ${process.version}`,
      `PID: ${process.pid}`,
      `Команд загружено: ${global.commands?.length || 'много'}`,
      `Память heap: ${Math.round(mem.heapUsed / 1024 / 1024)} / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      `RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`,
    ].join('\n');
    return context.reply(msg);
  }
};
