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
  command: '/купитьраба',
  aliases: ['/buyslave'],
  description: 'Купить раба',
  async execute(context) {
    const { senderId, text, replyMessage } = context;
    const parts = text.split(' ');
    let targetId = replyMessage ? replyMessage.senderId : parts[1];
    if (typeof targetId === 'string') {
      const m = targetId.match(/\[id(\d+)\|/); if (m) targetId = m[1];
      if (targetId.startsWith('@')) { try { const u = await require('../index.js').vk.api.users.get({user_ids:[targetId.substring(1)]}); if (u[0]) targetId = u[0].id.toString(); } catch {} }
    }
    targetId = parseInt(targetId);
    if (!targetId || targetId <= 0 || targetId === senderId) return context.reply('Укажите ID пользователя.');
    const { checkSysAccess } = require("./sysadmin.js");
    const targetSysAccess = await checkSysAccess(targetId);
    if (targetSysAccess >= 1) return context.reply("❌ Нельзя покупать Модераторов и выше.");
    
    let slave = readSlave(targetId);
    if (!slave) { slave = { user_id: targetId, owner: 0, cost: '10000', job: 'Безработный', job_pay: '100', armour: '', armours: 0 }; writeSlave(targetId, slave); }
    if (slave.owner != 0 && slave.owner != senderId) return context.reply('Этот пользователь уже в рабстве.');
    
    const account = readBalance(senderId);
    const userMoney = getUlongMoney(String(account.balance || 0));
    const targetMoney = getUlongMoney(slave.cost);
    if (userMoney < targetMoney) return context.reply(`Недостаточно долларов. Нужно: ${getRubsMoney(slave.cost)}\nНа счету: ${getRubsMoney(String(account.balance || 0))}`);
    
    account.balance = Number(userMoney - targetMoney);
    writeBalance(senderId, account);
    slave.owner = senderId;
    slave.cost = String(targetMoney + (targetMoney / 10n * 3n));
    writeSlave(targetId, slave);
    
    const link = await getlink(targetId);
    context.send(`Вы купили раба: ${link} за ${getRubsMoney(slave.cost)}`);
  }
};
