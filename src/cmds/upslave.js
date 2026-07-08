const fs = require('fs');
const path = require('path');
const { getlink } = require('../util.js');
function getRubsMoney(money) { try { const n = BigInt(money); return n.toLocaleString('ru-RU') + '$'; } catch { return money + '$'; } }
function getUlongMoney(money) { try { return BigInt(money); } catch { return 0n; } }
function readBalance(userId) { const f = path.join(__dirname, '..', 'data', 'user_balances', `${userId}.json`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {balance:0}; } }
function writeBalance(userId, d) { const dir = path.join(__dirname, '..', 'data', 'user_balances'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(d)); }
function readSlave(userId) { const f = path.join(__dirname, '..', 'data', 'slaves', `${userId}.json`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function writeSlave(userId, d) { const dir = path.join(__dirname, '..', 'data', 'slaves'); if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true}); fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(d)); }

module.exports = {
  command: '/прокачатьраба',
  aliases: ['/upslave'],
  description: 'Прокачать раба',
  async execute(context) {
    const { senderId, text } = context;
    const parts = text.split(' ');
    const targetId = parseInt(parts[1]);
    if (!targetId) return context.reply('Укажите ID раба.');
    const slave = readSlave(targetId);
    if (!slave || slave.owner != senderId) return context.reply('Вы не владеете.');
    const account = readBalance(senderId);
    const userMoney = getUlongMoney(String(account.balance || 0));
    const cost = getUlongMoney(slave.cost) + (getUlongMoney(slave.cost) / 10n * 3n);
    if (userMoney < cost) return context.reply(`Недостаточно. Нужно: ${getRubsMoney(String(cost))}`);
    account.balance = Number(userMoney - cost);
    writeBalance(senderId, account);
    slave.cost = String(cost);
    slave.job_pay = String(getUlongMoney(slave.job_pay) + (getUlongMoney(slave.job_pay) / 10n * 2n));
    writeSlave(targetId, slave);
    context.send('Раб прокачан!');
  }
};
