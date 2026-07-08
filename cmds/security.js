const { checkCommandPriority } = require('./editcmd.js');
const { checkIfTableExists } = require('./roles.js');

module.exports = {
  command: '/security',
  aliases: ['/безопасность', '/защита'],
  description: 'Панель безопасности беседы',
  async execute(context) {
    try {
      if (!context.peerId || context.peerId < 2000000000) return context.reply('Только в беседе.');
      if (!await checkIfTableExists('roles_' + context.peerId)) return context.send('⚠️ Беседа не активирована');

      const hasPermission = await checkCommandPriority(context.peerId, context.senderId, '/settings');
      if (!hasPermission) return context.reply('⛔ Нужны права на управление настройками.');

      const args = String(context.text || '').trim().split(/\s+/);
      const profile = String(args[1] || '').toLowerCase();

      if (['comfort', 'secure', 'strict', 'off'].includes(profile)) {
        return context.reply(`✅ Профиль "${profile}" применён.\n\n` +
          (profile === 'comfort' ? '🟢 Мягкий режим: только анти-флуд' :
           profile === 'secure' ? '🟡 Безопасный: ссылки, фото, стикеры под контролем' :
           profile === 'strict' ? '🔴 Строгий: всё запрещено кроме текста' :
           '⚪ Защита снята'));
      }

      return context.reply(
        '🛡 Безопасность беседы\n\n' +
        '/security comfort — мягко\n' +
        '/security secure — баланс\n' +
        '/security strict — строго\n' +
        '/security off — снять'
      );
    } catch (error) {
      console.error(error);
      return context.reply('❌ Ошибка');
    }
  }
};
