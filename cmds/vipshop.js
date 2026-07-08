const { Keyboard } = require('vk-io');
const fs = require('fs');
const path = require('path');

const VIP_FILE = path.join(__dirname, '..', 'data', 'vip_users');
const BALANCE_DIR = path.join(__dirname, '..', 'data', 'user_balances');

function readVIP(uid) { try { return JSON.parse(fs.readFileSync(path.join(VIP_FILE, uid + '.json'), 'utf8')); } catch { return null; } }
function writeVIP(uid, data) { if (!fs.existsSync(VIP_FILE)) fs.mkdirSync(VIP_FILE, { recursive: true }); fs.writeFileSync(path.join(VIP_FILE, uid + '.json'), JSON.stringify(data)); }
function readBalance(uid) { try { return JSON.parse(fs.readFileSync(path.join(BALANCE_DIR, uid + '.json'), 'utf8')).balance || 0; } catch { return 0; } }
function writeBalance(uid, amount) { if (!fs.existsSync(BALANCE_DIR)) fs.mkdirSync(BALANCE_DIR, { recursive: true }); fs.writeFileSync(path.join(BALANCE_DIR, uid + '.json'), JSON.stringify({ balance: amount })); }

const VIP_TIERS = {
  vip1: { name: '💎 VIP 1', price: 50000, days: 30, vipType: 1, perks: ['Цветной ник', 'Эмодзи в ник', '+10% к бонусу', 'Доступ к /voice'] },
  vip2: { name: '💎 VIP 2', price: 150000, days: 30, vipType: 2, perks: ['Всё из VIP 1', '+20% к бонусу', 'Приоритет в тикетах', 'Иммунитет к муту'] },
  vip3: { name: '💎 VIP 3', price: 500000, days: 30, vipType: 3, perks: ['Всё из VIP 2', '+30% к бонусу', 'Доступ к /say', 'Скрытый режим'] },
  vip_perm: { name: '👑 VIP Навсегда', price: 5000000, days: -1, vipType: 1, perks: ['VIP 1 навсегда', 'Все преимущества VIP 1'] }
};

module.exports = {
  command: '/vipshop',
  aliases: ['/випшоп', '/vipperk', '/vipperks'],
  description: 'VIP магазин',
  async execute(context) {
    const { senderId, text } = context;
    const parts = String(text || '').trim().split(/\s+/);
    const sub = (parts[1] || 'list').toLowerCase();

    if (sub === 'list' || sub === 'список') {
      let msg = '🏪 VIP Магазин\n\n';
      for (const [id, tier] of Object.entries(VIP_TIERS)) {
        msg += `${tier.name}\n💰 ${tier.price.toLocaleString()}$\n📅 ${tier.days === -1 ? 'Навсегда' : tier.days + ' дней'}\n✨ ${tier.perks.slice(0, 3).join(', ')}\n/vipshop buy ${id}\n\n`;
      }

      const kb = Keyboard.builder();
      for (const [id, tier] of Object.entries(VIP_TIERS)) {
        kb.callbackButton({ label: tier.name, payload: { event_id: 7960, cmd: 'vipshop_buy', item: id }, color: Keyboard.POSITIVE_COLOR });
        kb.row();
      }
      kb.inline();
      return context.send({ message: msg, keyboard: kb });
    }

    if (sub === 'buy' || sub === 'купить') {
      const itemId = parts[2];
      const tier = VIP_TIERS[itemId];
      if (!tier) return context.reply('❌ /vipshop list');

      // Подарок другому
      let targetId = senderId;
      if (parts[3]) {
        let t = parts[3];
        if (t.startsWith('@')) { try { const u = await require('../vkInstance.js').api.users.get({ user_ids: [t.substring(1)] }); if (u[0]) t = String(u[0].id); } catch {} }
        targetId = parseInt(t) || senderId;
      }

      const balance = readBalance(senderId);
      if (balance < tier.price) return context.reply(`❌ Недостаточно средств.\n💰 Нужно: ${tier.price.toLocaleString()}$\n💵 Баланс: ${balance.toLocaleString()}$`);

      writeBalance(senderId, balance - tier.price);

      const vip = readVIP(targetId) || { userid: targetId, vip_type: 0, is_permanent: 0, expiry_date: null, granted_by: senderId, granted_date: new Date().toISOString() };
      vip.vip_type = Math.max(vip.vip_type || 0, tier.vipType);
      vip.granted_by = senderId;
      vip.granted_date = new Date().toISOString();

      if (tier.days === -1) {
        vip.is_permanent = 1;
        vip.expiry_date = null;
      } else {
        const expiry = new Date(Date.now() + tier.days * 86400000);
        vip.expiry_date = expiry.toISOString();
        vip.is_permanent = 0;
      }
      writeVIP(targetId, vip);

      const targetName = targetId === senderId ? 'Вы' : `@id${targetId}`;
      return context.reply(`✅ ${tier.name} куплен для ${targetName}!\n💰 ${tier.price.toLocaleString()}$\n📅 ${tier.days === -1 ? 'Навсегда' : tier.days + ' дней'}`);
    }

    return context.reply('❌ /vipshop list | /vipshop buy [тип] [ID]');
  }
};
