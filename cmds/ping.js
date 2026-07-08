const os = require('os');

function formatUptime(sec) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${d ? d + 'д ' : ''}${h ? h + 'ч ' : ''}${m ? m + 'м ' : ''}${s}с`;
}

function getSystemInfo() {
  const mem = process.memoryUsage();
  const cpus = os.cpus();
  let totalIdle = 0, totalTick = 0;
  cpus.forEach(cpu => { for (const t in cpu.times) { totalTick += cpu.times[t]; } totalIdle += cpu.times.idle; });
  const cpuUsage = ((1 - totalIdle / totalTick) * 100).toFixed(1);
  return {
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(0),
    heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(0),
    cpu: cpuUsage,
    cores: cpus.length,
    freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(1),
    totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(1)
  };
}

module.exports = {
  command: '/ping',
  aliases: ['/пинг'],
  description: 'Проверка бота',
  async execute(context) {
    const start = Date.now();
    const info = getSystemInfo();
    const netLatency = start - (context.createdAt ? context.createdAt * 1000 : start);
    let netStatus = netLatency <= 500 ? 'Отличное' : netLatency <= 1000 ? 'Хорошее' : netLatency <= 2000 ? 'Среднее' : 'Плохое';

    const msg = `🤖 Бот работает\n\n` +
      `🌐 Сеть: ${netStatus} (${netLatency} мс)\n` +
      `⚡ CPU: ${info.cpu}% (${info.cores} ядер)\n` +
      `💾 Память: ${info.heapUsed}/${info.heapTotal} МБ\n` +
      `💿 Система: ${info.freeMem}/${info.totalMem} ГБ\n` +
      `⏱ Аптайм: ${formatUptime(Math.floor(process.uptime()))}\n` +
      `⚡ Ответ: ${Date.now() - start} мс`;

    await context.reply(msg);
  }
};
