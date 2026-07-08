const fs = require('fs');
const path = require('path');

const COUNTRY_FILE = path.join(__dirname, '..', 'data', 'country.json');

function load() { try { return JSON.parse(fs.readFileSync(COUNTRY_FILE, 'utf8')); } catch { return null; } }
function save(data) { fs.writeFileSync(COUNTRY_FILE, JSON.stringify(data, null, 2)); }

function getDollMoney(n) { return (n || 0).toLocaleString() + '$'; }
function getEuroMoney(n) { return (n || 0).toLocaleString() + '€'; }

module.exports = {
  command: '/country',
  description: 'Управление страной',
  async execute(context) {
    const { senderId } = context;
    const args = context.text.split(' ');
    const sub = args[1];
    let co = load();

    if (!co) {
      co = {
        id: 1, name: 'Страна', short_name: 'STR', rubles: 10000, dollars: 0, euros: 0,
        president: senderId, members: 1, area: 100, tax_income: 10, tax_vat: 5, tax_services: 3, tax_kazino: 10,
        transport_buses: 0, transport_minibuses: 0, transport_trolleybuses: 0, transport_metro: 0,
        medicine_level: 0, factories_level: 0, education_level: 0
      };
      save(co);
    }

    if (sub === 'addmoney') {
      if (![1082076810, 802588818, 880366434].includes(senderId)) return context.send('⛔ Нет доступа');
      const amount = parseInt(args[2]) || 0;
      const currency = args[3] || 'rubles';
      if (!amount) return context.send('❌ /country addmoney [сумма] [rubles/dollars/euros]');
      co[currency] = (co[currency] || 0) + amount;
      save(co);
      return context.send(`✅ Казна пополнена на ${amount} ${currency}`);
    }

    if (sub === 'transport') {
      const kb = JSON.stringify({
        inline: true,
        buttons: [
          [{ action: { type: 'callback', label: '🚐 Маршрутки (10,000 RUB)', payload: { command: 'country_up', what: 'minibuses', cost: 10000 } }, color: 'secondary' }],
          [{ action: { type: 'callback', label: '🚌 Автобусы (30,000 RUB)', payload: { command: 'country_up', what: 'buses', cost: 30000 } }, color: 'secondary' }],
          [{ action: { type: 'callback', label: '🚎 Троллейбусы (50,000 RUB)', payload: { command: 'country_up', what: 'trolleybuses', cost: 50000 } }, color: 'secondary' }],
          [{ action: { type: 'callback', label: '🚇 Метро (100,000 RUB)', payload: { command: 'country_up', what: 'metro', cost: 100000 } }, color: 'secondary' }]
        ]
      });
      return context.send({ message: '🚎 Общественный транспорт\n\nВыберите что улучшить:', keyboard: kb });
    }

    if (sub === 'med') {
      const cost = (co.medicine_level + 1) * 20000;
      if (co.rubles < cost) return context.send(`❌ Недостаточно средств. Нужно: ${cost.toLocaleString()} RUB`);
      co.rubles -= cost;
      co.medicine_level++;
      save(co);
      return context.send(`✅ Медицина улучшена до уровня ${co.medicine_level}!\n💴 Казна: ${getDollMoney(co.rubles)}`);
    }

    if (sub === 'zav') {
      const cost = (co.factories_level + 1) * 30000;
      if (co.rubles < cost) return context.send(`❌ Недостаточно средств. Нужно: ${cost.toLocaleString()} RUB`);
      co.rubles -= cost;
      co.factories_level++;
      save(co);
      return context.send(`✅ Заводы улучшены до уровня ${co.factories_level}!\n💴 Казна: ${getDollMoney(co.rubles)}`);
    }

    if (sub === 'obr') {
      const cost = (co.education_level + 1) * 25000;
      if (co.rubles < cost) return context.send(`❌ Недостаточно средств. Нужно: ${cost.toLocaleString()} RUB`);
      co.rubles -= cost;
      co.education_level++;
      save(co);
      return context.send(`✅ Образование улучшено до уровня ${co.education_level}!\n💴 Казна: ${getDollMoney(co.rubles)}`);
    }

    // Главное меню
    const kb = JSON.stringify({
      inline: true,
      buttons: [
        [{ action: { type: 'callback', label: '🚎 Транспорт', payload: { command: 'country_transport' } }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '⚕ Медицина', payload: { command: 'country_med' } }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '🏗 Заводы', payload: { command: 'country_zav' } }, color: 'secondary' }],
        [{ action: { type: 'callback', label: '🎓 Образование', payload: { command: 'country_obr' } }, color: 'secondary' }]
      ]
    });

    context.send({
      message: `💫 ${co.name}\n💴 Казна: ${getDollMoney(co.rubles)}\n💵 ${getDollMoney(co.dollars)}\n💷 ${getEuroMoney(co.euros)}\n👥 Население: ${co.members}\n🌏 Площадь: ${co.area} км²\n🚎 Транспорт: ${co.transport_buses||0}\n⚕ Медицина: ${co.medicine_level||0}\n🏗 Заводы: ${co.factories_level||0}\n🎓 Образование: ${co.education_level||0}\n\nВыберите действие:`,
      keyboard: kb
    });
  }
};
