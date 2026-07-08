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
  command: '/продатьраба',
  aliases: ['/sellslave'],
  description: 'Продать раба',
  async execute(context) {
    const { senderId, text } = context;
    const parts = text.split(' ');
    const targetId = parseInt(parts[1]);
    if (!targetId) return context.reply('Укажите ID раба.');
    const slave = readSlave(targetId);
    if (!slave || slave.owner != senderId) return context.reply('Вы не владеете этим рабом.');
    const cost = getUlongMoney(slave.cost) / 2n;
    if (parts[2] === '1') {
      const account = readBalance(senderId);
      account.balance = Number(getUlongMoney(String(account.balance || 0)) + cost);
      writeBalance(senderId, account);
      slave.owner = 0;
      writeSlave(targetId, slave);
      context.send(`Вы продали ${await getlink(targetId)} за ${getRubsMoney(String(cost))}`);
    } else {
      context.send(`Продать за ${getRubsMoney(String(cost))}? Напишите: /продатьраба ${targetId} 1`);
    }
  }
};
