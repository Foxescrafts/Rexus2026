const { checkSysAccess, getAccessLevelName } = require('./sysadmin.js');
const { Keyboard } = require('vk-io');
const { getlink } = require('../util.js');
const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'company_platform.json');

function read() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return { companies: {} }; } }
function write(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

const ROLE_LEVELS = { member: 10, staff: 30, observer: 40, departmentlead: 55, chatmanager: 65, curator: 75, director: 85, deputy: 90, founder: 95, owner: 100 };
const ROLE_NAMES = { member: 'Участник', staff: 'Сотрудник', observer: 'Наблюдатель', departmentlead: 'Руководитель отдела', chatmanager: 'Чат-менеджер', curator: 'Куратор', director: 'Директор', deputy: 'Зам. владельца', founder: 'Основатель', owner: 'Владелец' };
const PROFILES = { rexus: { title: 'Rexus', emoji: '👑', security: 'high', load: 'ultra', strictness: 90, commands: ['/компания панель', '/компания отчёт'] }, safe: { title: 'Safe', emoji: '🛡', security: 'max', load: 'big', strictness: 100, commands: ['/компания аудит', '/компания слежка'] } };

function ensureCompany(data, companyId) {
  if (!data.companies[companyId]) {
    data.companies[companyId] = {
      name: 'Компания ' + companyId, owner: null, members: {}, departments: {}, chats: {},
      customCommands: {}, policies: {}, requests: {}, tasks: {}, rating: {}, reputation: {},
      contracts: {}, shop: {}, hiring: {}, products: {}, reviews: {},
      market: { public: {}, shadow: {} }, finance: { balance: 0, entries: [] },
      brand: { logo: '🏢', slogan: 'Развитие, порядок, результат.', theme: 'rexus' },
      applications: {}, analytics: { views: 0, panelOpens: 0, lastOpenAt: null },
      shares: { total: 1000, treasury: 1000, price: 100, holders: {}, history: [] },
      profile: 'rexus'
    };
  }
  return data.companies[companyId];
}

function getMemberRole(company, userId) {
  return company.members[String(userId)]?.role || null;
}

function hasAccess(company, userId, minRole) {
  const role = getMemberRole(company, userId);
  if (!role) return false;
  return (ROLE_LEVELS[role] || 0) >= (ROLE_LEVELS[minRole] || 0);
}

// ============ ОСНОВНАЯ КОМАНДА ============
module.exports = {
  command: '/company',
  aliases: ['/компания', '/бизнес', '/корпорация', '/предприятие'],
  description: 'Rexus Company Platform — полная ERP система',
  async execute(context) {
    const { senderId, text, peerId } = context;
    const access = await checkSysAccess(senderId);
    const parts = String(text || '').trim().split(/\s+/);
    const sub = (parts[1] || 'panel').toLowerCase();
    const data = read();
    const companyId = String(peerId);
    const company = data.companies[companyId];

    // ============ ПАНЕЛЬ ============
    if (sub === 'panel' || sub === 'панель') {
      if (!company) return context.reply('❌ Компания не создана. /company create [название]');
      company.analytics.panelOpens = (company.analytics.panelOpens || 0) + 1;
      company.analytics.lastOpenAt = Date.now();
      write(data);

      const members = Object.keys(company.members).length;
      const depts = Object.keys(company.departments).length;
      const tasks = (company.tasks && Object.keys(company.tasks).length) || 0;

      const kb = Keyboard.builder()
        .callbackButton({ label: '📊 Отделы', payload: { event_id: 7950, cmd: 'dept', cid: companyId }, color: Keyboard.SECONDARY_COLOR })
        .callbackButton({ label: '💰 Финансы', payload: { event_id: 7950, cmd: 'finance', cid: companyId }, color: Keyboard.POSITIVE_COLOR })
        .callbackButton({ label: '👥 Участники', payload: { event_id: 7950, cmd: 'members', cid: companyId }, color: Keyboard.PRIMARY_COLOR })
        .row()
        .callbackButton({ label: '📋 Задачи', payload: { event_id: 7950, cmd: 'tasks', cid: companyId }, color: Keyboard.SECONDARY_COLOR })
        .callbackButton({ label: '🏪 Магазин', payload: { event_id: 7950, cmd: 'shop', cid: companyId }, color: Keyboard.POSITIVE_COLOR })
        .callbackButton({ label: '📈 Акции', payload: { event_id: 7950, cmd: 'shares', cid: companyId }, color: Keyboard.PRIMARY_COLOR })
        .inline();

      return context.send({
        message: `${company.brand.logo} ${company.name}\n"${company.brand.slogan}"\n\n👥 Участников: ${members}\n🏢 Отделов: ${depts}\n📋 Задач: ${tasks}\n💰 Баланс: ${company.finance.balance.toLocaleString()}$\n📈 Акции: ${company.shares.price.toLocaleString()}$`,
        keyboard: kb
      });
    }

    // ============ СОЗДАТЬ ============
    if (sub === 'create' || sub === 'создать') {
      if (company) return context.reply('❌ Компания уже существует.');
      const name = parts.slice(2).join(' ') || 'Компания';
      data.companies[companyId] = {
        name, owner: String(senderId),
        members: { [String(senderId)]: { role: 'owner', joinedAt: Date.now() } },
        departments: {}, chats: {}, customCommands: {}, policies: {}, requests: {}, tasks: {},
        rating: {}, reputation: {}, contracts: {}, shop: {}, hiring: {}, products: {}, reviews: {},
        market: { public: {}, shadow: {} }, finance: { balance: 0, entries: [] },
        brand: { logo: '🏢', slogan: 'Развитие, порядок, результат.', theme: 'rexus' },
        applications: {}, analytics: { views: 0, panelOpens: 1, lastOpenAt: Date.now() },
        shares: { total: 1000, treasury: 1000, price: 100, holders: { [String(senderId)]: 1000 }, history: [{ date: Date.now(), price: 100, type: 'ipo' }] },
        profile: 'rexus'
      };
      write(data);
      return context.reply(`✅ Компания "${name}" создана!\n👑 Владелец: @id${senderId}\n📈 Выпущено 1000 акций по 100$\n/company panel`);
    }

    // ============ ДОБАВИТЬ УЧАСТНИКА ============
    if (sub === 'add' || sub === 'добавить') {
      if (!company) return context.reply('❌ Нет компании.');
      if (!hasAccess(company, senderId, 'director')) return context.reply('❌ Только директор+ может добавлять.');

      let targetId = parts[2];
      if (!targetId) return context.reply('❌ /company add [ID]');
      if (targetId.startsWith('@')) {
        try { const u = await vk.api.users.get({ user_ids: [targetId.substring(1)] }); if (u[0]) targetId = String(u[0].id); } catch { return context.reply('❌ Не найден.'); }
      }
      targetId = String(parseInt(targetId));
      if (!targetId || targetId === 'NaN') return context.reply('❌ Некорректный ID.');
      if (company.members[targetId]) return context.reply('❌ Уже в компании.');

      const role = parts[3] || 'member';
      if (!ROLE_LEVELS[role]) return context.reply('❌ Роль: member/staff/director/deputy/founder');

      company.members[targetId] = { role, joinedAt: Date.now(), addedBy: String(senderId) };
      company.analytics.views = (company.analytics.views || 0) + 1;
      write(data);
      return context.reply(`✅ @id${targetId} добавлен как ${ROLE_NAMES[role]}.\n/company panel`);
    }

    // ============ УДАЛИТЬ ============
    if (sub === 'remove' || sub === 'kick' || sub === 'удалить') {
      if (!company) return context.reply('❌ Нет компании.');
      if (!hasAccess(company, senderId, 'director')) return context.reply('❌ Только директор+.');

      let targetId = String(parseInt(String(parts[2] || '').replace(/[^0-9]/g, '')));
      if (!targetId || targetId === 'NaN') return context.reply('❌ /company remove [ID]');
      if (targetId === company.owner) return context.reply('❌ Нельзя удалить владельца.');

      delete company.members[targetId];
      write(data);
      return context.reply(`✅ @id${targetId} удалён.`);
    }

    // ============ ОТДЕЛЫ ============
    if (sub === 'dept' || sub === 'отдел') {
      if (!company) return context.reply('❌ Нет компании.');
      const action = parts[2];

      if (action === 'create' || action === 'создать') {
        if (!hasAccess(company, senderId, 'director')) return context.reply('❌ Директор+.');
        const deptName = parts.slice(3).join(' ') || 'Отдел';
        const deptId = 'dept_' + Date.now();
        company.departments[deptId] = { name: deptName, lead: null, members: [], createdBy: String(senderId), createdAt: Date.now() };
        write(data);
        return context.reply(`✅ Отдел "${deptName}" создан.`);
      }

      if (action === 'list' || action === 'список') {
        const depts = Object.entries(company.departments);
        if (!depts.length) return context.reply('Нет отделов.');
        let msg = '🏢 Отделы:\n';
        for (const [id, d] of depts) msg += `• ${d.name} (${(d.members || []).length} чел.)\n`;
        return context.reply(msg);
      }

      return context.reply('❌ /company dept create/list');
    }

    // ============ ФИНАНСЫ ============
    if (sub === 'finance' || sub === 'финансы') {
      if (!company) return context.reply('❌ Нет компании.');
      const action = parts[2];

      if (action === 'add' || action === 'пополнить') {
        if (!hasAccess(company, senderId, 'deputy')) return context.reply('❌ Зам. владельца+.');
        const amount = parseInt(parts[3]) || 0;
        if (amount <= 0) return context.reply('❌ Сумма > 0.');
        company.finance.balance += amount;
        company.finance.entries.push({ type: 'deposit', amount, by: String(senderId), date: Date.now() });
        write(data);
        return context.reply(`💰 Баланс пополнен на ${amount.toLocaleString()}$. Текущий: ${company.finance.balance.toLocaleString()}$`);
      }

      const entries = company.finance.entries.slice(-10).reverse();
      let msg = `💰 Баланс: ${company.finance.balance.toLocaleString()}$\n\nПоследние операции:\n`;
      for (const e of entries) msg += `${e.type}: ${e.amount.toLocaleString()}$ (${new Date(e.date).toLocaleDateString('ru-RU')})\n`;
      return context.reply(msg || 'Нет операций.');
    }

    // ============ ЗАДАЧИ ============
    if (sub === 'tasks' || sub === 'задачи') {
      if (!company) return context.reply('❌ Нет компании.');
      const action = parts[2];

      if (action === 'add' || action === 'создать') {
        if (!hasAccess(company, senderId, 'staff')) return context.reply('❌ Сотрудник+.');
        const title = parts.slice(3).join(' ') || 'Задача';
        const taskId = 'task_' + Date.now();
        company.tasks[taskId] = { title, assignedTo: null, status: 'open', createdBy: String(senderId), createdAt: Date.now() };
        write(data);
        return context.reply(`✅ Задача "${title}" создана.`);
      }

      const tasks = Object.entries(company.tasks).filter(([id, t]) => t.status === 'open');
      if (!tasks.length) return context.reply('Нет открытых задач.');
      let msg = '📋 Задачи:\n';
      for (const [id, t] of tasks.slice(0, 10)) msg += `• ${t.title} (${t.status})\n`;
      return context.reply(msg);
    }

    // ============ МАГАЗИН ============
    if (sub === 'shop' || sub === 'магазин') {
      if (!company) return context.reply('❌ Нет компании.');
      const action = parts[2];

      if (action === 'add' || action === 'добавить') {
        if (!hasAccess(company, senderId, 'curator')) return context.reply('❌ Куратор+.');
        const name = parts[3] || 'Товар';
        const price = parseInt(parts[4]) || 100;
        const itemId = 'item_' + Date.now();
        company.shop[itemId] = { name, price, seller: String(senderId), createdAt: Date.now() };
        write(data);
        return context.reply(`✅ Товар "${name}" за ${price.toLocaleString()}$ добавлен.`);
      }

      const items = Object.entries(company.shop);
      if (!items.length) return context.reply('Магазин пуст.');
      let msg = '🏪 Магазин:\n';
      for (const [id, item] of items.slice(0, 10)) msg += `• ${item.name} — ${item.price.toLocaleString()}$\n`;
      return context.reply(msg);
    }

    // ============ АКЦИИ ============
    if (sub === 'shares' || sub === 'акции') {
      if (!company) return context.reply('❌ Нет компании.');
      const action = parts[2];

      if (action === 'buy' || action === 'купить') {
        const amount = parseInt(parts[3]) || 1;
        const cost = amount * company.shares.price;
        if (company.shares.treasury < amount) return context.reply('❌ Недостаточно акций.');
        // Проверка баланса покупателя
        const buyerBal = readBalance(senderId);
        if (buyerBal < cost) return context.reply(`❌ Нужно ${cost.toLocaleString()}$, у вас ${buyerBal.toLocaleString()}$.`);

        writeBalance(senderId, buyerBal - cost);
        company.shares.treasury -= amount;
        company.shares.holders[String(senderId)] = (company.shares.holders[String(senderId)] || 0) + amount;
        company.finance.balance += cost;
        company.shares.history.push({ date: Date.now(), price: company.shares.price, amount, buyer: String(senderId), type: 'buy' });
        company.shares.price = Math.floor(company.shares.price * 1.05);
        write(data);
        return context.reply(`✅ Куплено ${amount} акций за ${cost.toLocaleString()}$. Цена теперь ${company.shares.price.toLocaleString()}$`);
      }

      if (action === 'sell' || action === 'продать') {
        const amount = parseInt(parts[3]) || 1;
        const holder = company.shares.holders[String(senderId)] || 0;
        if (holder < amount) return context.reply('❌ Недостаточно акций.');
        const revenue = amount * company.shares.price;

        writeBalance(senderId, (readBalance(senderId) || 0) + revenue);
        company.shares.holders[String(senderId)] = holder - amount;
        company.shares.treasury += amount;
        company.finance.balance -= revenue;
        company.shares.history.push({ date: Date.now(), price: company.shares.price, amount, seller: String(senderId), type: 'sell' });
        company.shares.price = Math.floor(company.shares.price * 0.95);
        write(data);
        return context.reply(`✅ Продано ${amount} акций за ${revenue.toLocaleString()}$. Цена теперь ${company.shares.price.toLocaleString()}$`);
      }

      return context.reply(`📈 Акции\nЦена: ${company.shares.price.toLocaleString()}$\nВ казне: ${company.shares.treasury}/${company.shares.total}\nДержателей: ${Object.keys(company.shares.holders).length}\n\n/company shares buy [кол-во]\n/company shares sell [кол-во]`);
    }

    // ============ ИНФО ============
    if (sub === 'info' || sub === 'инфо') {
      if (!company) return context.reply('❌ Нет компании.');
      let msg = `${company.brand.logo} ${company.name}\n"${company.brand.slogan}"\n\n`;
      msg += `👑 Владелец: @id${company.owner}\n`;
      msg += `🛡 Профиль: ${PROFILES[company.profile]?.title || 'Rexus'}\n`;
      msg += `💰 Баланс: ${company.finance.balance.toLocaleString()}$\n`;
      msg += `📈 Акции: ${company.shares.price.toLocaleString()}$\n\n`;
      msg += '👥 Участники:\n';
      for (const [id, m] of Object.entries(company.members)) {
        msg += `• @id${id} — ${ROLE_NAMES[m.role] || m.role}\n`;
      }
      return context.reply(msg);
    }

    return context.reply(
      '🏢 Rexus Company Platform\n\n' +
      '/company create [название] — создать\n' +
      '/company panel — панель\n' +
      '/company add [ID] [роль] — добавить\n' +
      '/company remove [ID] — удалить\n' +
      '/company dept create [название] — отдел\n' +
      '/company finance add [сумма] — пополнить\n' +
      '/company tasks add [задача] — задача\n' +
      '/company shop add [товар] [цена] — товар\n' +
      '/company shares buy/sell [кол-во] — акции\n' +
      '/company info — информация'
    );
  }
};

// Вспомогательные функции
function readBalance(uid) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'user_balances', uid + '.json'), 'utf8')).balance || 0; } catch { return 0; }
}
function writeBalance(uid, amount) {
  const dir = path.join(ROOT, 'data', 'user_balances');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, uid + '.json'), JSON.stringify({ balance: amount }));
}
