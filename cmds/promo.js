const fs = require('fs');
const path = require('path');
const vk = require('../vkInstance.js');

const PROMO_FILE = path.join(__dirname, '..', 'data', 'promocodes.json');
const ADMINS_FILE = path.join(__dirname, '..', 'data', 'promo_admins.json');
const BALANCE_DIR = path.join(__dirname, '..', 'data', 'user_balances');

function readPromo() { try { return JSON.parse(fs.readFileSync(PROMO_FILE, 'utf8')); } catch { return []; } }
function writePromo(d) { fs.writeFileSync(PROMO_FILE, JSON.stringify(d, null, 2)); }
function readAdmins() { try { return JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8')); } catch { return ['880366434']; } }
function isAdmin(uid) { return readAdmins().includes(String(uid)); }

function readBalance(uid) {
  try { return JSON.parse(fs.readFileSync(path.join(BALANCE_DIR, uid + '.json'), 'utf8')).balance || 0; } catch { return 0; }
}
function writeBalance(uid, amount) {
  if (!fs.existsSync(BALANCE_DIR)) fs.mkdirSync(BALANCE_DIR, { recursive: true });
  fs.writeFileSync(path.join(BALANCE_DIR, uid + '.json'), JSON.stringify({ balance: amount }));
}

module.exports = {
  command: '/promo',
  aliases: ['/use', '/promolist', '/promoadmins'],
  description: 'Система промокодов',
  async execute(context) {
    const userId = String(context.senderId);
    const parts = context.text.split(/\s+/);
    const sub = parts[0]?.toLowerCase();

    // /use CODE
    if (sub === '/use') {
      const code = parts[1]?.toUpperCase();
      if (!code) return context.reply('❌ /use [код]');
      const promos = readPromo();
      const promo = promos.find(p => p.code === code && !p.isUsed);
      if (!promo) return context.reply('❌ Промокод не найден или использован.');

      promo.isUsed = true;
      promo.usedBy = userId;
      promo.usedAt = Date.now();
      writePromo(promos);

      const balance = readBalance(userId);
      writeBalance(userId, balance + promo.amount);

      let creatorName = `[id${promo.createdBy}|Админ]`;
      try { const u = await vk.api.users.get({ user_ids: [promo.createdBy] }); if (u[0]) creatorName = `[id${promo.createdBy}|${u[0].first_name} ${u[0].last_name}]`; } catch {}

      return context.reply(`✅ Промокод активирован!\n💰 Начислено: ${promo.amount.toLocaleString()}$\n👤 Создатель: ${creatorName}`);
    }

    // /promo CODE AMOUNT — создать
    if (sub === '/promo') {
      if (!isAdmin(userId)) return context.reply('❌ Нет прав.');
      const code = parts[1]?.toUpperCase();
      const amount = parseFloat(parts[2]);
      if (!code || !/^[A-Z0-9]+$/.test(code)) return context.reply('❌ Код: буквы и цифры.');
      if (isNaN(amount) || amount <= 0 || amount > 10000000) return context.reply('❌ Сумма от 1 до 10 млн.');

      const promos = readPromo();
      if (promos.find(p => p.code === code)) return context.reply('❌ Код уже существует.');
      promos.push({ code, amount, createdBy: userId, createdAt: Date.now(), isUsed: false });
      writePromo(promos);
      return context.reply(`✅ Промокод ${code} на ${amount.toLocaleString()}$ создан.\n/use ${code}`);
    }

    // /promolist
    if (sub === '/promolist') {
      if (!isAdmin(userId)) return context.reply('❌ Нет прав.');
      const promos = readPromo();
      if (!promos.length) return context.reply('Нет промокодов.');
      let msg = '📋 Промокоды:\n';
      for (const p of promos.slice(-20)) msg += `${p.code}: ${p.amount.toLocaleString()}$ ${p.isUsed ? '✅ исп' : '❌ активен'}\n`;
      return context.reply(msg);
    }

    // /promoadmins
    if (sub === '/promoadmins') {
      const admins = readAdmins();
      let msg = '👑 Админы промокодов:\n';
      for (const id of admins) {
        try { const u = await vk.api.users.get({ user_ids: [id] }); msg += `• ${u[0]?.first_name || id}\n`; } catch { msg += `• ${id}\n`; }
      }
      return context.reply(msg);
    }

    return context.reply('❌ /use CODE | /promo CODE СУММА | /promolist');
  }
};
