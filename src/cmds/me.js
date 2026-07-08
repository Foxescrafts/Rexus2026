const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

function readBalance(uid) {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'user_balances', uid + '.json'), 'utf8')).balance || 0; } catch { return 0; }
}
function writeBalance(uid, amount) {
  const dir = path.join(__dirname, '..', 'data', 'user_balances');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, uid + '.json'), JSON.stringify({ balance: amount }));
}

module.exports = {
  command: '/me',
  aliases: ['/action', '/я'],
  description: 'Действие от лица персонажа (1000$)',
  async execute(context) {
    const userId = context.senderId;
    const text = context.text || '';
    const action = text.replace(/^\/me\s*|\/action\s*|\/я\s*/i, '').trim();
    if (!action) return context.reply('❌ /me [действие]\nПример: /me курит');

    const balance = readBalance(userId);
    if (balance < 1000) return context.reply(`❌ Недостаточно средств. Нужно 1000$, ваш баланс: ${balance}$`);

    writeBalance(userId, balance - 1000);

    let name = `@id${userId} (Пользователь)`;
    try {
      const u = await vk.api.users.get({ user_ids: [userId] });
      if (u[0]) name = `@id${userId} (${u[0].first_name} ${u[0].last_name})`;
    } catch {}

    context.send(`${name} ${action}`);
  }
};
