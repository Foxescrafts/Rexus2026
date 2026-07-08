const { Keyboard } = require('vk-io');

module.exports = {
  command: '/top1',
  aliases: ['/топ1', '/worldtop'],
  description: 'Топ-1 диагностика',
  async execute(context) {
    const mem = process.memoryUsage();
    const uptime = Math.floor(process.uptime());
    const msg = [
      '🏆 Rexus Топ-1 Готовность',
      '',
      `⏱ Аптайм: ${Math.floor(uptime / 3600)}ч ${Math.floor((uptime % 3600) / 60)}м`,
      `💾 Память: ${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
      `📋 Команд загружено: ${global.commands?.length || 'много'}`,
      `✅ Статус: Готов к топ-1`,
      '',
      '🛠 /setup | 📋 /help | 💚 /health'
    ].join('\n');

    const kb = Keyboard.builder()
      .textButton({ label: '💚 /health', payload: { command: '/health' }, color: Keyboard.POSITIVE_COLOR })
      .textButton({ label: '📋 /help', payload: { command: '/help' }, color: Keyboard.SECONDARY_COLOR })
      .inline();

    return context.send({ message: msg, keyboard: kb });
  }
};
