const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');
const activeGames = new Map();
const DATA_FILE = path.join(__dirname, '..', 'data', 'crocodile_words.json');

const DEFAULT_WORDS = [
  { word: 'самолёт', category: 'транспорт', hints: ['Летает в небе', 'У него есть крылья', 'Перевозит пассажиров'] },
  { word: 'телефон', category: 'техника', hints: ['Есть почти у каждого', 'Через него звонят', 'Смартфон — его вид'] },
  { word: 'арбуз', category: 'еда', hints: ['Большой и круглый', 'Внутри красный', 'Летний сладкий плод'] },
  { word: 'компьютер', category: 'техника', hints: ['Нужен для игр и работы', 'Бывает ноутбук', 'Есть монитор и клавиатура'] },
  { word: 'жираф', category: 'животные', hints: ['Живёт в Африке', 'Очень высокий', 'У него длинная шея'] },
  { word: 'гитара', category: 'музыка', hints: ['Музыкальный инструмент', 'У неё есть струны', 'На ней играют аккордами'] },
  { word: 'мороженое', category: 'еда', hints: ['Холодное лакомство', 'Часто продаётся в стаканчике', 'Тает на жаре'] },
  { word: 'библиотека', category: 'места', hints: ['Там много книг', 'Нужно соблюдать тишину', 'Можно брать литературу'] },
  { word: 'футбол', category: 'спорт', hints: ['Командная игра', 'Нужен мяч', 'Забивают голы'] },
  { word: 'космос', category: 'вселенная', hints: ['Там летают ракеты', 'Там нет воздуха', 'Там находятся планеты'] },
  { word: 'пингвин', category: 'животные', hints: ['Чёрно-белая птица', 'Живёт в холоде', 'Не летает, но хорошо плавает'] },
  { word: 'шахматы', category: 'игры', hints: ['Настольная игра', 'Есть король и ферзь', 'Играют на клетчатой доске'] },
  { word: 'поезд', category: 'транспорт', hints: ['Ездит по рельсам', 'Состоит из вагонов', 'Бывает пассажирский и грузовой'] },
  { word: 'радуга', category: 'природа', hints: ['Появляется после дождя', 'В ней много цветов', 'Её видно в небе'] },
  { word: 'пожарный', category: 'профессии', hints: ['Спасает людей', 'Тушит огонь', 'Ездит на красной машине'] },
  { word: 'карандаш', category: 'школа', hints: ['Им пишут и рисуют', 'Его нужно точить', 'Бывает цветной и простой'] },
  { word: 'вертолёт', category: 'транспорт', hints: ['Летает', 'У него есть винт', 'Может зависать в воздухе'] },
  { word: 'дракон', category: 'фантастика', hints: ['Мифическое существо', 'Часто изображают с крыльями', 'Иногда дышит огнём'] },
  { word: 'аквариум', category: 'дом', hints: ['Там живут рыбы', 'Внутри вода', 'Стоит дома или в офисе'] },
  { word: 'шоколад', category: 'еда', hints: ['Сладость', 'Бывает молочный и тёмный', 'Его делают из какао'] },
  { word: 'робот', category: 'техника', hints: ['Может выполнять команды', 'Бывает человекоподобным', 'Его создают инженеры'] },
  { word: 'снеговик', category: 'зима', hints: ['Его лепят зимой', 'Делают из снега', 'У него часто морковка вместо носа'] },
  { word: 'кинотеатр', category: 'места', hints: ['Туда ходят смотреть фильмы', 'Там большой экран', 'Покупают билеты на сеанс'] },
  { word: 'пирамида', category: 'история', hints: ['Связана с Египтом', 'Имеет треугольные стороны', 'Очень древнее сооружение'] },
  { word: 'крокодил', category: 'животные', hints: ['Рептилия', 'Живёт в воде и на суше', 'У него много острых зубов'] }
];

function ensureDictionaryFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_WORDS, null, 2), 'utf8');
    }
  } catch (error) { console.error('Ошибка при подготовке словаря Крокодила:', error); }
}

function loadWords() {
  ensureDictionaryFile();
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(raw) && raw.length > 0) return raw.filter((entry) => entry && entry.word);
  } catch (error) { console.error('Ошибка при чтении словаря Крокодила:', error); }
  return DEFAULT_WORDS;
}

function normalizeWord(value) {
  return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/gi, '');
}

function getRandomWord() {
  const pool = loadWords();
  return pool[Math.floor(Math.random() * pool.length)] || DEFAULT_WORDS[0];
}

function buildMask(word, hintsUsed = 0) {
  const letters = Array.from(String(word || ''));
  const normalized = normalizeWord(word);
  const revealCount = Math.min(Math.max(hintsUsed, 1), Math.max(1, normalized.length));
  const visibleIndexes = new Set([0]);
  for (let i = 1; i < revealCount && i < normalized.length; i += 1) visibleIndexes.add(i);
  return letters.map((char, index) => {
    if (!/[a-zа-яё]/i.test(char)) return char;
    return visibleIndexes.has(index) ? char.toUpperCase() : '•';
  }).join('');
}

async function getUserMention(userId) {
  try {
    const [user] = await vk.api.users.get({ user_ids: [userId] });
    if (user) return `[id${userId}|${user.first_name} ${user.last_name}]`;
  } catch (_) {}
  return `[id${userId}|Пользователь]`;
}

function getStatusMessage(game) {
  const hint = game.entry.hints[Math.min(game.hintsUsed, game.entry.hints.length - 1)] || 'Без подсказки';
  return [
    '🐊 Крокодил уже идёт.',
    `📂 Категория: ${game.entry.category || 'без категории'}`,
    `🔤 Маска: ${buildMask(game.entry.word, game.hintsUsed)}`,
    `💡 Подсказка: ${hint}`,
    `📝 Длина слова: ${String(game.entry.word).length}`
  ].join('\n');
}

module.exports = {
  command: '/crocodile',
  aliases: ['/крокодил', '/croc', '/кр', '/старт', '/начать', '/стоп', '/подсказка', '/статус'],
  description: 'Мини-игра Крокодил',
  async execute(context) {
    const txt = context.text || "";
    if (txt.startsWith("/старт") || txt.startsWith("/начать")) { context.text = "/крокодил start"; }
    if (txt.startsWith("/стоп")) { context.text = "/крокодил stop"; }
    if (txt.startsWith("/подсказка")) { context.text = "/крокодил hint"; }
    if (txt.startsWith("/статус")) { context.text = "/крокодил status"; }
    const peerId = context.peerId;
    if (context.text?.startsWith("/старт")) context.text = "/крокодил start";
    if (context.text?.startsWith("/стоп")) context.text = "/крокодил stop";
    if (context.text?.startsWith("/подсказка")) context.text = "/крокодил hint";
    if (context.text?.startsWith("/статус")) context.text = "/крокодил status";
    const args = String(context.text || '').trim().split(/\s+/).slice(1);
    if (args[0] === "старт") args[0] = "start";
    if (args[0] === "стоп") args[0] = "stop";
    if (args[0] === "подсказка") args[0] = "hint";
    if (args[0] === "статус") args[0] = "status";
    const action = (args[0] || "help").toLowerCase().trim();
    console.log("CROC action:", action);
    const currentGame = activeGames.get(peerId);

    if (['help', 'помощь', 'rules', 'правила'].includes(action)) {
      return context.reply('🐊 Крокодил\n\nКоманды:\n/крокодил start — начать\n/крокодил hint — подсказка\n/крокодил status — статус\n/крокодил stop — остановить');
    }

    if (['start', 'начать', 'go', 'play'].includes(action)) {
      if (currentGame) return context.reply(getStatusMessage(currentGame));
      const entry = getRandomWord();
      activeGames.set(peerId, { creatorId: context.senderId, peerId, entry, hintsUsed: 0, startedAt: Date.now() });
      return context.send(`🐊 Игра «Крокодил» началась!\n📂 Категория: ${entry.category || 'без категории'}\n🔤 Маска: ${buildMask(entry.word, 0)}\n💡 Подсказка: ${entry.hints[0] || 'Подсказка скоро будет'}\n📝 Длина слова: ${String(entry.word).length}\n\nПишите ответы обычными сообщениями в чат.`);
    }

    if (['hint', 'подсказка', 'подсказки'].includes(action)) {
      if (!currentGame) return context.reply('❌ Нет активной игры.');
      currentGame.hintsUsed += 1;
      const hintIndex = Math.min(currentGame.hintsUsed, currentGame.entry.hints.length - 1);
      return context.send(`💡 Подсказка:\n📂 Категория: ${currentGame.entry.category || 'без категории'}\n🔤 Маска: ${buildMask(currentGame.entry.word, currentGame.hintsUsed)}\n📝 Подсказка: ${currentGame.entry.hints[hintIndex] || 'Нет подсказок.'}`);
    }

    if (['status', 'статус', 'info', 'инфо'].includes(action)) {
      if (!currentGame) return context.reply('❌ Нет активной игры.');
      return context.reply(getStatusMessage(currentGame));
    }

    if (['stop', 'стоп', 'cancel', 'end'].includes(action)) {
      if (!currentGame) return context.reply('❌ Нет активной игры.');
      if (currentGame.creatorId !== context.senderId) return context.reply('❌ Только создатель может остановить.');
      activeGames.delete(peerId);
      return context.send(`🛑 Игра остановлена. Слово: ${currentGame.entry.word}`);
    }

    return context.reply('❌ /крокодил start, hint, status, stop');
  }
};

async function tryHandleGuess(context) {
  const peerId = context.peerId;
    if (context.text?.startsWith("/старт")) context.text = "/крокодил start";
    if (context.text?.startsWith("/стоп")) context.text = "/крокодил stop";
    if (context.text?.startsWith("/подсказка")) context.text = "/крокодил hint";
    if (context.text?.startsWith("/статус")) context.text = "/крокодил status";
  const game = activeGames.get(peerId);
  if (!game || !context.text || context.text.startsWith('/')) return false;

  const guess = normalizeWord(context.text);
  const answer = normalizeWord(game.entry.word);
  if (!guess) return false;
  if (guess !== answer) { await context.send("❌ Неправильно! Попробуй ещё."); return false; }

  const winner = await getUserMention(context.senderId);
  activeGames.delete(peerId);

  // Награда
  let rewardMsg = '';
  try {
    const reward = Math.floor(Math.random() * 4000) + 1000;
    const bal = await require('../filedb').getUserBalance(context.senderId);
    await require('../filedb').updateUserBalance(context.senderId, (bal || 0) + reward);
    rewardMsg = `\n💰 Награда: ${reward}$`;
  } catch(e) {}

  await context.send(`🎉 Крокодил разгадан!\n🏆 Победитель: ${winner}\n✅ Слово: ${game.entry.word}\n📂 Категория: ${game.entry.category || 'без категории'}${rewardMsg}\n\nЗапустить новый раунд: /крокодил start`);
  return true;
}

module.exports.activeGames = activeGames;
module.exports.tryHandleGuess = tryHandleGuess;
module.exports.normalizeWord = normalizeWord;
module.exports.buildMask = buildMask;
