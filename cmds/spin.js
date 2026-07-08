const fs = require('fs');
const path = require('path');

function readSlave(userId) {
  const f = path.join(__dirname, '..', 'data', 'slaves', `${userId}.json`);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}
function writeSlave(userId, d) {
  const dir = path.join(__dirname, '..', 'data', 'slaves');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(d));
}

module.exports = {
  command: '/spin',
  aliases: ['/спин', '/колесо', '/удача'],
  description: 'Покрутить колесо фортуны и получить цепи',
  async execute(context) {
    try {
      const userId = context.senderId;
      if (Math.random() < 0.15) {
        const chainsWon = Math.floor(Math.random() * 3) + 1;
        let slave = readSlave(userId) || { user_id: userId, owner: 0, cost: '10000', job: 'Безработный', job_pay: '100', armour: '', armours: 0 };
        slave.armours = (slave.armours || 0) + chainsWon;
        writeSlave(userId, slave);

        let winMessage = chainsWon === 1 ? '🍀 Вы выиграли 1 цепь!' : chainsWon === 2 ? '🎉 Вы выиграли 2 цепи!' : '🔥 ДЖЕКПОТ! Вы выиграли 3 цепи!';
        return context.send(`🎰 КРУТИМ КОЛЕСО...\n\n${winMessage}\n\nТеперь у вас ${slave.armours} цепей. /цепи @id — защитить раба.`);
      } else {
        const msgs = ['😢 Не повезло.', '💫 Почти!', '🌟 Удача отвернулась.', '🎯 Мимо!', '✨ Фортуна переменчива!'];
        return context.send(`🎰 КРУТИМ КОЛЕСО...\n\n${msgs[Math.floor(Math.random() * msgs.length)]}`);
      }
    } catch (error) {
      console.error(error);
      return context.send('❌ Ошибка');
    }
  }
};
