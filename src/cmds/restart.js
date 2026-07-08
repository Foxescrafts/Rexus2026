module.exports = {
    command: '/restart',
    aliases: ['/перезагрузка', '/reboot'],
    description: 'Перезапуск бота (только для системных администраторов)',
    async execute(context) {
        const userId = context.senderId;
        const fs = require('fs');
        const sysadminFile = `./data/sysadmins/${userId}.json`;
        
        try {
            fs.accessSync(sysadminFile);
        } catch {
            return context.send('⛔ Доступ запрещен | Только для системных администраторов');
        }
        
        await context.send('🔄 Перезагружаюсь...');
        process.exit(0);
    }
};
