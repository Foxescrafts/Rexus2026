const fs = require('fs');
const path = require('path');
const { getlink } = require('../util.js');
const { Keyboard } = require('vk-io');

function getRubsMoney(money) { try { const n = BigInt(money); return n.toLocaleString('ru-RU') + '$'; } catch { return money + '$'; } }
function readSlave(userId) { const f = path.join(__dirname, '..', 'data', 'slaves', `${userId}.json`); try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } }
function readAllSlaves() { const dir = path.join(__dirname, '..', 'data', 'slaves'); try { return fs.readdirSync(dir).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch { return []; } }

module.exports = {
  command: '/рабы',
  aliases: ['/slaves', '/моирабы'],
  description: 'Список рабов',
  async execute(context) {
    const { peerId, senderId, text } = context;
    const parts = text.split(' ');
    let ownerId = senderId;
    
    if (parts[1]) {
      let raw = parts[1];
      const match = raw.match(/\[id(\d+)\|/);
      if (match) raw = match[1];
      if (raw.startsWith('@')) {
        try {
          const users = await require('../index.js').vk.api.users.get({ user_ids: [raw.substring(1)] });
          if (users && users[0]) raw = users[0].id.toString();
        } catch {}
      }
      ownerId = parseInt(raw) || senderId;
    }
    if (ownerId <= 0) return;

    let userSlave = readSlave(ownerId);
    if (!userSlave) userSlave = { user_id: ownerId, owner: 0, cost: '10000', job: 'Безработный', job_pay: '100', armour: '', armours: 0 };
    
    const allSlaves = readAllSlaves();
    const slaves = allSlaves.filter(s => s.owner == ownerId);

    // Кнопки для себя
    let keyboard;
    if (ownerId !== senderId) {
      if (String(userSlave.owner) === String(senderId)) {
        keyboard = Keyboard.builder()
          .callbackButton({ label: 'Прокачать', payload: { event_id: 7791, id: ownerId }, color: Keyboard.POSITIVE_COLOR })
          .callbackButton({ label: 'Продать', payload: { event_id: 7792, id: ownerId }, color: Keyboard.NEGATIVE_COLOR })
          .callbackButton({ label: 'Цепи', payload: { event_id: 7793, id: ownerId }, color: Keyboard.NEGATIVE_COLOR }).inline();
      } else {
        keyboard = Keyboard.builder()
          .callbackButton({ label: 'Купить', payload: { event_id: 7790, id: ownerId }, color: Keyboard.NEGATIVE_COLOR }).inline();
      }
    } else {
      // СМОТРИМ СЕБЯ — показываем кнопки для КАЖДОГО раба
      if (slaves.length > 0) {
        keyboard = Keyboard.builder();
        for (const s of slaves) {
          const link = await getlink(s.user_id);
          keyboard.callbackButton({ label: 'Прокачать', payload: { event_id: 7791, id: s.user_id }, color: Keyboard.POSITIVE_COLOR });
          keyboard.callbackButton({ label: 'Продать', payload: { event_id: 7792, id: s.user_id }, color: Keyboard.NEGATIVE_COLOR });
          keyboard.row();
        }
        keyboard.inline();
      } else if (userSlave.owner != 0) {
        keyboard = Keyboard.builder()
          .callbackButton({ label: 'Выкупиться', payload: { event_id: 7794 }, color: Keyboard.POSITIVE_COLOR })
          .callbackButton({ label: 'Собрать прибыль', payload: { event_id: 7795 }, color: Keyboard.NEGATIVE_COLOR }).inline();
      } else {
        keyboard = Keyboard.builder()
          .callbackButton({ label: 'Собрать прибыль', payload: { event_id: 7795 }, color: Keyboard.NEGATIVE_COLOR }).inline();
      }
    }

    let msg = '';
    if (userSlave.owner != 0) {
      msg = `Владелец: ${await getlink(parseInt(userSlave.owner))}\n`;
    } else {
      msg = ownerId !== senderId ? 'Пользователь свободен.\n' : 'Вы свободны.\n';
    }
    msg += `Стоимость: ${getRubsMoney(userSlave.cost)}\n\n`;

    if (slaves.length === 0) {
      msg += ownerId !== senderId ? 'Нет рабов.' : 'Вы не имеете рабов.\nКупите: /купитьраба';
      return context.send({ message: msg, keyboard });
    }

    msg += ownerId !== senderId ? `Его рабы (${slaves.length}):\n\n` : `Ваши рабы (${slaves.length}):\n\n`;
    let i = 0;
    for (const s of slaves) {
      i++;
      const link = await getlink(s.user_id);
      const armour = s.armour && new Date(s.armour) > new Date() ? `🔒 Цепи до ${new Date(s.armour).toLocaleString('ru-RU')}. ` : '';
      msg += `${i}. ${link} — ${s.job} (${getRubsMoney(s.job_pay)}/ч). Стоимость: ${getRubsMoney(s.cost)}. ${armour}\n`;
    }
    msg += `\n/купитьраба | /продатьраба | /датьработу | /прокачатьраба | /цепи`;
    context.send({ message: msg, keyboard });
  }
};
