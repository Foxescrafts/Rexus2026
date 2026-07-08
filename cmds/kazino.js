const fs = require('fs');
const path = require('path');

function formatMoney(n) { try { return BigInt(n).toLocaleString('ru-RU') + '$'; } catch { return String(n) + '$'; } }
function toBigInt(n) { try { return BigInt(n); } catch { return 0n; } }
function parseStavka(text) {
  text = text.toLowerCase().replace(/[$₽€]/g, '');
  if (text.endsWith('к')) return BigInt(Math.floor(parseFloat(text) * 1000));
  if (text.endsWith('м')) return BigInt(Math.floor(parseFloat(text) * 1000000));
  try { return BigInt(text); } catch { return 0n; }
}
function readBalance(uid) {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'user_balances', uid + '.json'), 'utf8')); }
  catch { return { balance: 0 }; }
}
function writeBalance(uid, data) {
  const dir = path.join(__dirname, '..', 'data', 'user_balances');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, uid + '.json'), JSON.stringify(data));
}

function sendMsg(context, text, kb) {
  // Универсальная отправка - работает и в message, и в message_event
  try {
    if (context.send && typeof context.send === 'function') {
      return context.send({ message: text, keyboard: kb });
    }
    if (context.reply && typeof context.reply === 'function') {
      return context.reply({ message: text, keyboard: kb });
    }
    const { vk } = require('../index.js');
    const peerId = context.peerId || context.userId || context.senderId;
    return vk.api.messages.send({ peer_id: peerId, message: text, keyboard: kb, random_id: Date.now() });
  } catch(e) {
    console.error('sendMsg error:', e.message);
  }
}

module.exports = {
  command: '/kazino',
  aliases: ['/казино', '/casino'],
  description: 'Казино',
  async execute(context) {
    const uid = context.senderId || context.userId;
    const args = context.text ? context.text.split(' ').slice(1) : [];
    const acc = readBalance(uid);
    const userMoney = toBigInt(acc.balance || 0);

    if (!args[0]) return sendMsg(context, 'Укажите сумму.\nПример: /казино 5к или /казино все');

    let stavka;
    if (args[0] === 'все' || args[0] === 'всё' || args[0] === 'all') {
      stavka = userMoney;
    } else {
      stavka = parseStavka(args[0]);
    }

    if (stavka <= 0n) return sendMsg(context, 'Ставка не может быть 0.');
    if (stavka > userMoney) return sendMsg(context, `Недостаточно средств. Баланс: ${formatMoney(acc.balance)}`);

    const ran = BigInt(Math.floor(Math.random() * 100) + 1);
    let win = 0n;
    let msg = `Ставка: ${formatMoney(String(stavka))}\n`;

    if (ran < 1n) { win = stavka * 5n; msg += `💪 КУШ! ${formatMoney(String(win))} (x5)!`; }
    else if (ran >= 80n) { win = -(stavka / 2n); msg += `😕 Проигрыш ${formatMoney(String(-win))} (x0.5)`; }
    else if (ran >= 70n) { win = -(stavka / 3n); msg += `😕 Проигрыш ${formatMoney(String(-win))} (x0.33)`; }
    else if (ran >= 55n) { msg += `🤭 При своих! (x1)`; }
    else if (ran >= 40n) { win = stavka / 3n; msg += `💥 Выигрыш ${formatMoney(String(win))} (x1.33)!`; }
    else if (ran >= 25n) { win = stavka / 5n; msg += `💥 Выигрыш ${formatMoney(String(win))} (x1.2)!`; }
    else { win = -stavka; msg += `😫 Проигрыш ${formatMoney(String(stavka))} (x0)`; }

    const newBalance = userMoney + win;
    acc.balance = Number(newBalance);
    writeBalance(uid, acc);
    msg += `\n💰 Баланс: ${formatMoney(String(newBalance))}`;

    // Кнопки
    const s1 = String(stavka / 10n * 15n);
    const s2 = String(stavka / 2n);
    const row = [];
    row.push({ action: { type: 'callback', label: 'Повторить', payload: { command: 'kazino_play', stavka: String(stavka) } }, color: 'secondary' });
    if (toBigInt(s1) > 0n && toBigInt(s1) <= newBalance) row.push({ action: { type: 'callback', label: 'x1.5', payload: { command: 'kazino_play', stavka: s1 } }, color: 'secondary' });
    if (toBigInt(s2) > 0n && toBigInt(s2) <= newBalance) row.push({ action: { type: 'callback', label: 'x0.5', payload: { command: 'kazino_play', stavka: s2 } }, color: 'secondary' });
    row.push({ action: { type: 'callback', label: 'ВСЁ', payload: { command: 'kazino_play', stavka: 'all' } }, color: 'secondary' });

    const kb = JSON.stringify({ inline: true, buttons: [row] });
    sendMsg(context, msg, kb);
  }
};
