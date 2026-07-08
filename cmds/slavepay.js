const fs = require('fs');
const path = require('path');
function getRubsMoney(money) { try { const n = BigInt(money); return n.toLocaleString('ru-RU') + '$'; } catch { return money + '$'; } }
function getUlongMoney(money) { try { return BigInt(money); } catch { return 0n; } }
function readBalance(userId) { const f = path.join(__dirname, '..', 'data', 'user_balances', `${userId}.json`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {balance:0}; } }
function writeBalance(userId, d) { const dir = path.join(__dirname, '..', 'data', 'user_balances'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(d)); }
function readAllSlaves() { const dir = path.join(__dirname, '..', 'data', 'slaves'); try { return fs.readdirSync(dir).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch { return []; } }

module.exports = {
  command: '/slavepay',
  aliases: ['/собратьприбыль'],
  description: 'Собрать прибыль с рабов',
  async execute(context) {
    const { senderId } = context;
    const allSlaves = readAllSlaves();
    const mySlaves = allSlaves.filter(s => s.owner == senderId);
    if (mySlaves.length === 0) return context.reply('У вас нет рабов.');
    let total = 0n;
    for (const s of mySlaves) total += BigInt(s.job_pay || 100);
    const account = readBalance(senderId);
    account.balance = Number(getUlongMoney(String(account.balance || 0)) + total);
    writeBalance(senderId, account);
    context.send(`Собрано с ${mySlaves.length} рабов: ${getRubsMoney(String(total))}`);
  }
};
