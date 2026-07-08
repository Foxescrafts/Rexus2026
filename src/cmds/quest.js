const { Keyboard } = require('vk-io');
const fs = require('fs');
const path = require('path');

const QUEST_FILE = path.join(__dirname, '..', 'data', 'quests.json');
const USER_QUEST_FILE = path.join(__dirname, '..', 'data', 'user_quests.json');

function readQuests() { try { return JSON.parse(fs.readFileSync(QUEST_FILE, 'utf8')); } catch { return []; } }
function readUserQuests() { try { return JSON.parse(fs.readFileSync(USER_QUEST_FILE, 'utf8')); } catch { return {}; } }
function writeUserQuests(d) { fs.writeFileSync(USER_QUEST_FILE, JSON.stringify(d, null, 2)); }

const DEFAULT_QUESTS = [
  { id: 1, title: 'Новичок', desc: 'Напиши 10 сообщений в чат', goal: 10, type: 'messages', reward: 5000 },
  { id: 2, title: 'Общительный', desc: 'Напиши 50 сообщений', goal: 50, type: 'messages', reward: 25000 },
  { id: 3, title: 'Богач', desc: 'Накопи 100 000$', goal: 100000, type: 'balance', reward: 10000 },
  { id: 4, title: 'Миллионер', desc: 'Накопи 1 000 000$', goal: 1000000, type: 'balance', reward: 50000 },
  { id: 5, title: 'Игрок', desc: 'Сыграй в рулетку 5 раз', goal: 5, type: 'roulette', reward: 15000 },
  { id: 6, title: 'Фармер', desc: 'Собери бонус 3 дня подряд', goal: 3, type: 'daily', reward: 30000 },
  { id: 7, title: 'Рабовладелец', desc: 'Купи 3 рабов', goal: 3, type: 'slaves', reward: 25000 },
  { id: 8, title: 'Цепи', desc: 'Накопи 10 цепей', goal: 10, type: 'chains', reward: 20000 },
  { id: 9, title: 'Вип', desc: 'Купи VIP статус', goal: 1, type: 'vip', reward: 100000 },
  { id: 10, title: 'Легенда', desc: 'Выполни все квесты', goal: 9, type: 'all_quests', reward: 500000 }
];

module.exports = {
  command: '/quest',
  aliases: ['/квест', '/квесты', '/задания'],
  description: 'Система квестов',
  async execute(context) {
    const { senderId, text } = context;
    const parts = String(text || '').trim().split(/\s+/);
    const sub = (parts[1] || 'list').toLowerCase();

    // Инициализация квестов
    let quests = readQuests();
    if (!quests.length) {
      quests = DEFAULT_QUESTS;
      fs.writeFileSync(QUEST_FILE, JSON.stringify(quests, null, 2));
    }

    const userQuests = readUserQuests();
    if (!userQuests[senderId]) userQuests[senderId] = { completed: [], progress: {} };

    if (sub === 'list' || sub === 'список') {
      let msg = '📜 Квесты:\n\n';
      for (const q of quests) {
        const done = userQuests[senderId].completed.includes(q.id);
        const prog = userQuests[senderId].progress[q.id] || 0;
        msg += `${done ? '✅' : '⬜'} ${q.title}: ${q.desc}\n   Прогресс: ${prog}/${q.goal} | Награда: ${q.reward.toLocaleString()}$\n\n`;
      }

      const kb = Keyboard.builder();
      for (const q of quests.slice(0, 5)) {
        const done = userQuests[senderId].completed.includes(q.id);
        kb.callbackButton({ label: (done ? '✅ ' : '') + q.title, payload: { event_id: 7980, cmd: 'quest_info', qid: q.id }, color: done ? Keyboard.POSITIVE_COLOR : Keyboard.SECONDARY_COLOR });
        kb.row();
      }
      kb.inline();
      return context.send({ message: msg, keyboard: kb });
    }

    if (sub === 'claim' || sub === 'забрать') {
      const qid = parseInt(parts[2]);
      const quest = quests.find(q => q.id === qid);
      if (!quest) return context.reply('❌ Квест не найден.');
      if (userQuests[senderId].completed.includes(qid)) return context.reply('❌ Уже выполнено.');

      const prog = userQuests[senderId].progress[qid] || 0;
      if (prog < quest.goal) return context.reply(`❌ Прогресс: ${prog}/${quest.goal}`);

      userQuests[senderId].completed.push(qid);
      writeUserQuests(userQuests);

      // Выдача награды
      const balFile = path.join(__dirname, '..', 'data', 'user_balances', senderId + '.json');
      let bal = 0;
      try { bal = JSON.parse(fs.readFileSync(balFile, 'utf8')).balance || 0; } catch {}
      bal += quest.reward;
      const dir = path.dirname(balFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(balFile, JSON.stringify({ balance: bal }));

      return context.reply(`✅ Квест "${quest.title}" выполнен!\n💰 Награда: ${quest.reward.toLocaleString()}$\n💵 Баланс: ${bal.toLocaleString()}$`);
    }

    return context.reply('❌ /quest list | /quest claim [ID]');
  }
};
