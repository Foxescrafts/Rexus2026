const fs = require('fs');
const path = require('path');
const { Keyboard } = require('vk-io');

function readVIP(userId) {
  const f = path.join(__dirname, '..', 'data', 'vip_users', `${userId}.json`);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}
function writeVIP(userId, data) {
  const dir = path.join(__dirname, '..', 'data', 'vip_users');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(data));
}
function readBalance(userId) {
  const f = path.join(__dirname, '..', 'data', 'user_balances', `${userId}.json`);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return { balance: 0 }; }
}
function writeBalance(userId, data) {
  const dir = path.join(__dirname, '..', 'data', 'user_balances');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${userId}.json`), JSON.stringify(data));
}

const VIP_COST = 100000;

module.exports = {
  command: '/vip',
  aliases: ['/вип', '/vipinfo'],
  description: 'VIP статус',
  async execute(context) {
    const { senderId } = context;
    const vip = readVIP(senderId);
    
    if (!vip || vip.vip_type === 0 || vip.vip_type === '0') {
      const kb = Keyboard.builder()
        .callbackButton({ label: 'Купить', payload: { event_id: 7902 }, color: Keyboard.POSITIVE_COLOR })
        .inline();
      return context.send({ message: `💎 У вас нет VIP.\nСтоимость: ${VIP_COST.toLocaleString()}$\nДлительность: 30 дней`, keyboard: kb });
    }
    
    const lvl = parseInt(vip.vip_type) || 1;
    let timeText = vip.is_permanent ? 'навсегда' : (vip.expiry_date ? 'до ' + new Date(vip.expiry_date).toLocaleString('ru-RU') : 'неизвестно');
    
    context.send(`💎 VIP ${lvl} уровня\n⏰ Действует: ${timeText}`);
  }
};

// Обработчик кнопки
module.exports.handleVipBuy = async function(context) {
  const { userId } = context;
  if (!context.eventPayload || context.eventPayload.event_id !== 7902) return false;
  
  const vip = readVIP(userId);
  if (vip && vip.vip_type > 0) {
    await context.send('У вас уже есть VIP.');
    return true;
  }
  
  const balance = readBalance(userId);
  if ((balance.balance || 0) < VIP_COST) {
    await context.send(`Недостаточно средств. Нужно: ${VIP_COST.toLocaleString()}$`);
    return true;
  }
  
  balance.balance -= VIP_COST;
  writeBalance(userId, balance);
  writeVIP(userId, { userid: userId, vip_type: 1, is_permanent: 0, expiry_date: new Date(Date.now() + 30*86400000).toISOString(), granted_by: userId, granted_date: new Date().toISOString() });
  await context.send(`✅ VIP куплен на 30 дней за ${VIP_COST.toLocaleString()}$!`);
  return true;
};
