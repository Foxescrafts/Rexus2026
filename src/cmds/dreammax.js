module.exports = {
  command: '/rexusmax',
  aliases: ['/max', '/скорость'],
  description: 'Диагностика Rexus MAX Performance',
  async execute(context) {
    const mem = process.memoryUsage();
    const msg = [
      '⚡ Rexus MAX Performance',
      '',
      `Статус: включён`,
      `Аптайм: ${Math.floor(process.uptime())}с`,
      `Node: ${process.version}`,
      `PID: ${process.pid}`,
      '',
      `💾 Память`,
      `RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`,
      `Heap: ${Math.round(mem.heapUsed / 1024 / 1024)} / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    ].join('\n');
    return context.reply(msg);
  }
};
