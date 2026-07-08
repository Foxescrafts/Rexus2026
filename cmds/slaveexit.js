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
  command: '/slaveexit',
  aliases: ['/выкупиться'],
  description: 'Выкупиться из рабства',
  async execute(context) {
    const { senderId } = context;
    const slave = readSlave(senderId);
    if (!slave || slave.owner == 0) return context.reply('Вы свободны.');
    if (slave.armour && new Date(slave.armour) > new Date()) return context.reply("Вы не можете выкупиться — на вас цепи до " + new Date(slave.armour).toLocaleString("ru-RU") + ".");
    const cost = getUlongMoney(slave.cost);
    const account = readBalance(senderId);
    const userMoney = getUlongMoney(String(account.balance || 0));
    if (userMoney < cost) return context.reply(`Недостаточно. Нужно: ${getRubsMoney(String(cost))}`);
    account.balance = Number(userMoney - cost);
    writeBalance(senderId, account);
    const ownerId = slave.owner;
    slave.owner = 0;
    writeSlave(senderId, slave);
    context.send(`Вы выкупились у ${await getlink(ownerId)}!`);
  }
};
