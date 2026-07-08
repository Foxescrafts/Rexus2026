const fs = require('fs');
const path = require('path');
const vk = require('../vkInstance.js');

const VIP_FILE = path.join(__dirname, '..', 'data', 'vip_users');
const BALANCE_DIR = path.join(__dirname, '..', 'data', 'user_balances');

function readVIP(uid) { try { return JSON.parse(fs.readFileSync(path.join(VIP_FILE, uid + '.json'), 'utf8')); } catch { return null; } }
function writeVIP(uid, data) { if (!fs.existsSync(VIP_FILE)) fs.mkdirSync(VIP_FILE, { recursive: true }); fs.writeFileSync(path.join(VIP_FILE, uid + '.json'), JSON.stringify(data)); }
function readBalance(uid) { try { return JSON.parse(fs.readFileSync(path.join(BALANCE_DIR, uid + '.json'), 'utf8')).balance || 0; } catch { return 0; } }
function writeBalance(uid, amount) { if (!fs.existsSync(BALANCE_DIR)) fs.mkdirSync(BALANCE_DIR, { recursive: true }); fs.writeFileSync(path.join(BALANCE_DIR, uid + '.json'), JSON.stringify({ balance: amount })); }

const VIP_PRICE = 50000;
const VIP_DAYS = 30;

module.exports = {
  command: '/buyvip',
  aliases: ['/купитьвип', '/vipbuy'],
  description: 'Купить VIP (50 000$ / 30 дней)',
  async execute(context) {
    const { senderId, text, replyMessage } = context;
    let targetId = replyMessage?.senderId || senderId;
    const parts = String(text || '').trim().split(/\s+/);

    if (parts[1]) {
      let t = parts[1];
      if (t.startsWith('@')) { try { const u = await vk.api.users.get({ user_ids: [t.substring(1)] }); if (u[0]) t = String(u[0].id); } catch {} }
      targetId = parseInt(t) || senderId;
    }

    const balance = readBalance(senderId);
    if (balance < VIP_PRICE) return context.reply(`❌ Недостаточно средств.\n💰 VIP: ${VIP_PRICE.toLocaleString()}$\n💵 Баланс: ${balance.toLocaleString()}$`);

    const vip = readVIP(targetId) || { userid: targetId, vip_type: 0, is_permanent: 0, expiry_date: null };
    if (vip.is_permanent) return context.reply('❌ У цели уже вечный VIP.');

    writeBalance(senderId, balance - VIP_PRICE);

    vip.vip_type = Math.max(vip.vip_type || 1, 1);
    const expiry = new Date(Date.now() + VIP_DAYS * 86400000);
    vip.expiry_date = expiry.toISOString();
    vip.is_permanent = 0;
    vip.granted_by = senderId;
    vip.granted_date = new Date().toISOString();
    writeVIP(targetId, vip);

    const isGift = targetId !== senderId;
    return context.reply(
      `${isGift ? '🎁 VIP подарен' : '✅ VIP активирован'}\n` +
      `👤 Получатель: @id${targetId}\n` +
      `💎 VIP 1 уровня\n` +
      `📅 До: ${expiry.toLocaleDateString('ru-RU')}\n` +
      `💰 Списано: ${VIP_PRICE.toLocaleString()}$\n` +
      `✨ Перки: цветной ник, эмодзи, +10% бонус, /voice`
    );
  }
};
