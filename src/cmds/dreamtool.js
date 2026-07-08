module.exports = {
  command: '/rexustool',
  aliases: ['/инструмент', '/мгновенно'],
  description: 'Диагностика Rexus Instant Tool',
  async execute(context) {
    const mem = process.memoryUsage();
    const msg = [
      '🛠 Rexus Instant Tool',
      '',
      `Статус: включён`,
      `Аптайм: ${Math.floor(process.uptime())}с`,
      `💾 Память`,
      `RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`,
      `Heap: ${Math.round(mem.heapUsed / 1024 / 1024)} / ${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
    ].join('\n');
    return context.reply(msg);
  }
};
