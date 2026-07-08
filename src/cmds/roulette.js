const { getUserBalance, updateUserBalance, getUserBTC, updateUserBTC, getUserVipStatus } = require('../filedb');
const vk = require('../vkInstance');
const { updateGameStats } = require('./top.js');

function formatMoney(amount) {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1).replace('.0', '')}млрд`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1).replace('.0', '')}кк`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1).replace('.0', '')}к`;
  } else {
    return amount.toString();
  }
}

function parseAmount(amountStr) {
  const str = amountStr.toLowerCase().trim();
  
  // Проверяем BTC
  if (str.includes('btc')) {
    const btcAmount = parseFloat(str.replace('btc', ''));
    return {
      amount: btcAmount * 230000, // 1 BTC = 230k
      isBTC: true,
      btcAmount: btcAmount,
      originalStr: amountStr
    };
  }
  
  // Парсим VK-форматы
  if (str.includes('ккк')) {
    return {
      amount: parseFloat(str.replace('ккк', '')) * 1000000000000,
      isBTC: false,
      originalStr: amountStr
    };
  } else if (str.includes('млрд')) {
    return {
      amount: parseFloat(str.replace('млрд', '')) * 1000000000,
      isBTC: false,
      originalStr: amountStr
    };
  } else if (str.includes('кк')) {
    return {
      amount: parseFloat(str.replace('кк', '')) * 1000000,
      isBTC: false,
      originalStr: amountStr
    };
  } else if (str.includes('к')) {
    return {
      amount: parseFloat(str.replace('к', '')) * 1000,
      isBTC: false,
      originalStr: amountStr
    };
  } else {
    return {
      amount: parseFloat(str) || 0,
      isBTC: false,
      originalStr: amountStr
    };
  }
}

// Маппинг чисел к фотографиям
const numberPhotos = {
  0: 'photo-230511380_457239020',
  1: 'photo-230511380_457239021',
  2: 'photo-230511380_457239022',
  3: 'photo-230511380_457239023',
  4: 'photo-230511380_457239024',
  5: 'photo-230511380_457239025',
  6: 'photo-230511380_457239026',
  7: 'photo-230511380_457239027',
  8: 'photo-230511380_457239028',
  9: 'photo-230511380_457239029',
  10: 'photo-230511380_457239030',
  11: 'photo-230511380_457239031',
  12: 'photo-230511380_457239032',
  13: 'photo-230511380_457239033',
  14: 'photo-230511380_457239034',
  15: 'photo-230511380_457239035',
  16: 'photo-230511380_457239036',
  17: 'photo-230511380_457239037',
  18: 'photo-230511380_457239038',
  19: 'photo-230511380_457239039',
  20: 'photo-230511380_457239040',
  21: 'photo-230511380_457239041',
  22: 'photo-230511380_457239042',
  23: 'photo-230511380_457239043',
  24: 'photo-230511380_457239044',
  25: 'photo-230511380_457239045',
  26: 'photo-230511380_457239046',
  27: 'photo-230511380_457239047',
  28: 'photo-230511380_457239048',
  29: 'photo-230511380_457239049',
  30: 'photo-230511380_457239050',
  31: 'photo-230511380_457239051',
  32: 'photo-230511380_457239052',
  33: 'photo-230511380_457239053',
  34: 'photo-230511380_457239054',
  35: 'photo-230511380_457239055',
  36: 'photo-230511380_457239056'
};

// Красные и черные числа
const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// Map для активных игр
const activeGames = new Map();

// Новый handler для пакетных ставок и красивого вывода
module.exports = {
  name: "рулетка",
  command: "/рулетка",
  aliases: ["/roulette", "/казино"],
  async handler(ctx, args) {
    const userId = ctx.senderId || ctx.user_id || ctx.from_id;
    // Получаем имя игрока и создаем кликабельную ссылку VK
    let userName = 'Игрок';
    let vkName = `[id${userId}|Игрок]`;
    
    try {
      const vkApi = require('../vkInstance');
      const userInfo = await vkApi.api.users.get({ 
        user_ids: [userId], 
        fields: ['first_name', 'last_name'] 
      });
      
      if (userInfo && userInfo[0]) {
        const user = userInfo[0];
        userName = `${user.first_name} ${user.last_name}`;
        vkName = `[id${userId}|${userName}]`;
      }
    } catch (error) {
      console.log('Не удалось получить информацию о пользователе VK:', error.message);
    }
    const peerId = ctx.peerId || ctx.peer_id || ctx.chatId || ctx.chat_id;
    // Парсим ставки (поддержка ч1 500, ч 500, к 1000)
    const bets = [];
    
    // Правильно удаляем команду из текста
    let input = '';
    if (ctx.text) {
      // Удаляем команду типа "/рулетка" или "/roulette"
      input = ctx.text.replace(/^\/[рулеткаroulette]+\s*/i, '').trim();
    }
    
    // Если ничего не осталось, пробуем args
    if (input.length === 0 && args && args.length > 0) {
      input = args.join(' ');
    }
    
    // Удаляем некорректные форматы ставок, например "на 109"
    input = input.replace(/\s+на\s+\d+/gi, '');
    
    // Разбиваем на строки и обрабатываем каждую
    const lines = input.split(/\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      // Если нет переносов строк, обрабатываем как одну строку
      lines.push(input);
    }
    
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        let betType = parts[0];
        let amount = null;
        
        // Проверяем разные форматы включая BTC: "к 1000", "ч1 500", "к 1btc", "ч1 0.5бтс"
        let isBTC = false;
        let btcAmount = 0;
        
        if (/^\d+$/.test(parts[1])) {
          // Простой числовой формат: "к 1000"
          amount = parseInt(parts[1]);
        } else if (parts[1] && /^\d+[кккмлрд]+$/i.test(parts[1])) {
          // VK-стиль формат: "к 1к", "ч1 10кк"
          const parsed = parseAmount(parts[1]);
          amount = parsed.amount;
        } else if (parts[1] && /^\d*\.?\d+(btc|бтс)$/i.test(parts[1])) {
          // BTC формат: "к 1btc", "ч1 0.5бтс"
          btcAmount = parseFloat(parts[1].replace(/(btc|бтс)/i, ''));
          amount = btcAmount * 320000; // 1 BTC = 320к долларов
          isBTC = true;
        } else if (parts.length >= 3 && /^\d+$/.test(parts[2])) {
          // Сложный числовой формат: "ч 1 500" -> "ч1 500"
          betType = parts[0] + parts[1];
          amount = parseInt(parts[2]);
        } else if (parts.length >= 3 && parts[2] && /^\d+[кккмлрд]+$/i.test(parts[2])) {
          // Сложный VK-стиль формат: "ч 1 10к" -> "ч1 10к"
          betType = parts[0] + parts[1];
          const parsed = parseAmount(parts[2]);
          amount = parsed.amount;
        } else if (parts.length >= 3 && parts[2] && /^\d*\.?\d+(btc|бтс)$/i.test(parts[2])) {
          // Сложный BTC формат: "ч 1 0.5btc" -> "ч1 0.5btc"
          betType = parts[0] + parts[1];
          btcAmount = parseFloat(parts[2].replace(/(btc|бтс)/i, ''));
          amount = btcAmount * 320000; // 1 BTC = 320к долларов
          isBTC = true;
        }
        
        // Проверяем что ставка валидна
        if (betType && !isNaN(amount) && amount > 0) {
          bets.push({ betType, amount, isBTC, btcAmount });
        }
      }
    });
    if (bets.length === 0) {
      return ctx.send(`❓ Аргументы указаны неверно. Укажите ставку и сумму.

❓ Примеры использования:
/рулетка к 1000         — ставка на красное
/рулетка ч1 500         — ставка на первую четверть
/рулетка п1 10к         — ставка на первую половину
/рулетка к 1btc         — ставка на красное в BTC
/рулетка ч1 0.5бтс      — ставка на первую четверть в BTC
/рулетка — ответом на сообщение: /рулетка к 1000

🔍 Введено: ${input}`);
    }
    // --- Сначала проверяем игру и прием ставок ---
    if (!activeGames.has(peerId)) {
      activeGames.set(peerId, { bets: [], isAccepting: true, timer: null, users: new Set() });
    }
    const game = activeGames.get(peerId);
    
    // Проверяем, принимаются ли еще ставки (ДО списания баланса!)
    if (!game.isAccepting) {
      return ctx.send('🚫 Прием ставок уже закрыт!\n⏰ Дождитесь результатов текущего раунда.');
    }
    
    // Разделяем ставки на долларовые и BTC
    const dollarBets = bets.filter(b => !b.isBTC);
    const btcBets = bets.filter(b => b.isBTC);
    
    let totalDollarBet = dollarBets.reduce((sum, b) => sum + b.amount, 0);
    let totalBTCBet = btcBets.reduce((sum, b) => sum + b.btcAmount, 0);
    
    // Проверяем баланс долларов
    if (totalDollarBet > 0) {
      const balance = await getUserBalance(userId);
      if (balance < totalDollarBet) {
        return ctx.send(`❌ Недостаточно долларов\n💰 Ваш баланс: ${formatMoney(balance)}$`);
      }
    }
    
    // Проверяем баланс BTC
    if (totalBTCBet > 0) {
      const btcBalance = await getUserBTC(userId);
      if (btcBalance < totalBTCBet) {
        return ctx.send(`❌ Недостаточно BTC\n₿ Ваш BTC баланс: ${btcBalance} BTC`);
      }
    }
    
    // Списываем средства только после всех проверок
    if (totalDollarBet > 0) {
      const balance = await getUserBalance(userId);
      await updateUserBalance(userId, balance - totalDollarBet);
    }
    
    if (totalBTCBet > 0) {
      const btcBalance = await getUserBTC(userId);
      await updateUserBTC(userId, btcBalance - totalBTCBet);
    }
    
    bets.forEach(bet => {
      // Не даём ставить одинаковую ставку дважды от одного игрока
      if (!game.bets.find(b => b.userId === userId && b.betType === bet.betType)) {
        game.bets.push({ 
          userId, 
          userName, 
          vkName: vkName, 
          betType: bet.betType, 
          amount: bet.amount,
          isBTC: bet.isBTC || false,
          btcAmount: bet.btcAmount || 0
        });
      }
    });
    // Выводим список принятых ставок
    let msg = bets.map(bet => {
      let label = getBetLabel(bet.betType);
      
      // Если функция getBetLabel не смогла распознать тип ставки
      if (label === bet.betType) {
        // Проверяем, это ставка на конкретное число?
        if (/^\d+$/.test(bet.betType)) {
          label = `число ${bet.betType}`;
        } else {
          // Для неизвестных типов показываем как есть
          label = bet.betType;
        }
      }
      
      // Отображаем ставку в соответствующей валюте
      if (bet.isBTC) {
        return `✅ ${vkName} — ${bet.btcAmount} BTC на ${label}`;
      } else {
        return `✅ ${vkName} — ${formatMoney(bet.amount)}$ на ${label}`;
      }
    }).join('\n');
    
    // Добавляем информацию о том, что ставки приняты
    msg = `🎰 Ставки приняты:\n${msg}`;
    
    await ctx.send(msg);
    // Если это первая ставка — запускаем 10 секунд ожидания
    if (!game.timer) {
      game.timer = setTimeout(async () => {
        // Закрываем прием ставок
        game.isAccepting = false;
        await ctx.send('🚫 Прием ставок для игры "Рулетка" закрыт!\n⏰ Итоги раунда через 5 секунд...');
        
        // Ждем 5 секунд и показываем результат
        setTimeout(async () => {
          const result = await endGame(peerId);
          if (!result || !result.success) return ctx.send(result ? result.message : 'Ошибка!');
          
          // Красивое итоговое сообщение в новом формате
          let msg = `🎰 ИТОГИ ИГРЫ "РУЛЕТКА"\n\n`;
          msg += `🎲 Выпало число: ${result.number} ${redNumbers.includes(result.number) ? '🔴' : blackNumbers.includes(result.number) ? '⚫' : '🟢'}\n\n`;
          
          // Показываем все ставки в новом формате
          let totalLost = 0;
          let totalWon = 0;
          
          for (const r of result.results) {
            const betLabel = getBetLabel(r.betType);
            if (r.won) {
              msg += `✅ ${r.vkName || r.userName} — ${formatMoney(r.betAmount)}$ на ${betLabel}\n— Приз: ${formatMoney(r.prize)}$${r.vipMessage || ''}\n`;
              totalWon += r.prize;
            } else {
              msg += `❌ ${r.vkName || r.userName} — ${formatMoney(r.betAmount)}$ на ${betLabel}\n`;
              totalLost += r.betAmount;
            }
          }
          
          // Общая статистика
          if (totalLost > 0) msg += `\n💰 Проиграно: ${formatMoney(totalLost)}$`;
          
          await ctx.send({ message: msg, attachment: result.photo });
        }, 5000);
      }, 10000);
    } else {
      // Если игра уже идет, сбрасываем таймер на 10 секунд
      clearTimeout(game.timer);
      game.timer = setTimeout(async () => {
        // Закрываем прием ставок
        game.isAccepting = false;
        await ctx.send('🚫 Прием ставок для игры "Рулетка" закрыт!\n⏰ Итоги раунда через 5 секунд...');
        
        // Ждем 5 секунд и показываем результат
        setTimeout(async () => {
          const result = await endGame(peerId);
          if (!result || !result.success) return ctx.send(result ? result.message : 'Ошибка!');
          
          // Красивое итоговое сообщение в новом формате
          let msg = `🎰 ИТОГИ ИГРЫ "РУЛЕТКА"\n\n`;
          msg += `🎲 Выпало число: ${result.number} ${redNumbers.includes(result.number) ? '🔴' : blackNumbers.includes(result.number) ? '⚫' : '🟢'}\n\n`;
          
          // Показываем все ставки в новом формате
          let totalLost = 0;
          let totalWon = 0;
          
          for (const r of result.results) {
            const betLabel = getBetLabel(r.betType);
            if (r.won) {
              msg += `✅ ${r.vkName || r.userName} — ${formatMoney(r.betAmount)}$ на ${betLabel}\n— Приз: ${formatMoney(r.prize)}$${r.vipMessage || ''}\n`;
              totalWon += r.prize;
            } else {
              msg += `❌ ${r.vkName || r.userName} — ${formatMoney(r.betAmount)}$ на ${betLabel}\n`;
              totalLost += r.betAmount;
            }
          }
          
          // Общая статистика
          if (totalLost > 0) msg += `\n💰 Проиграно: ${formatMoney(totalLost)}$`;
          
          await ctx.send({ message: msg, attachment: result.photo });
        }, 5000);
      }, 10000);
    }
  },
  async execute(ctx) {
    console.log('roulette peerId:', ctx.peerId);
    const fs = require("fs");
    const path = require("path");
    const confFile = path.join(__dirname, "..", "data", "conference", `${ctx.peerId}.json`);
    if (fs.existsSync(confFile)) {
      const conf = JSON.parse(fs.readFileSync(confFile, "utf8"));
      if (conf.games === 0) return ctx.send("🎮 Игры отключены в этой беседе.");
    }
    await this.handler(ctx);
  }
};

function getBetLabel(type) {
  switch (type.toLowerCase()) {
    case 'к': case 'красное': return 'красное';
    case 'ч': case 'черное': return 'черное';
    case 'п1': return 'п1 [1-18]';
    case 'п2': return 'п2 [19-36]';
    case 'ч1': return 'первую четверть [1-9]';
    case 'ч2': return 'вторую четверть [10-18]';
    case 'ч3': return 'третью четверть [19-27]';
    case 'ч4': return 'четвертую четверть [28-36]';
    case 'д1': return 'первую дюжину [1-12]';
    case 'д2': return 'вторую дюжину [13-24]';
    case 'д3': return 'третью дюжину [25-36]';
    default: return type;
  }
}

// --- Новый endGame с разбором ставок ---
async function endGame(peerId) {
  try {
    const game = activeGames.get(peerId);
    if (!game) return { success: false, message: 'Игра не найдена' };
    
    // Игра уже должна быть закрыта к этому моменту
    game.isAccepting = false;
    const number = Math.floor(Math.random() * 37);
    const isRed = redNumbers.includes(number);
    const isBlack = blackNumbers.includes(number);
    let results = [];
    for (const bet of game.bets) {
      const user = bet.userId;
      const amount = bet.amount;
      let won = false;
      let prize = 0;
      let betType = bet.betType;
      let coef = 0;
      // --- Разбор ставок ---
      switch (betType.toLowerCase()) {
        case 'к': case 'красное': won = isRed; coef = 2; break;
        case 'ч': case 'черное': won = isBlack; coef = 2; break;
        case 'п1': won = number >= 1 && number <= 18; coef = 2; break;
        case 'п2': won = number >= 19 && number <= 36; coef = 2; break;
        case 'ч1': won = number >= 1 && number <= 9; coef = 4; break;
        case 'ч2': won = number >= 10 && number <= 18; coef = 4; break;
        case 'ч3': won = number >= 19 && number <= 27; coef = 4; break;
        case 'ч4': won = number >= 28 && number <= 36; coef = 4; break;
        case 'д1': won = number >= 1 && number <= 12; coef = 3; break;
        case 'д2': won = number >= 13 && number <= 24; coef = 3; break;
        case 'д3': won = number >= 25 && number <= 36; coef = 3; break;
        default:
          if (/^\d+$/.test(betType)) {
            const targetNumber = parseInt(betType);
            won = number === targetNumber;
            coef = 36;
          }
          break;
      }
      if (won) {
        // Проверяем VIP статус для возможного x2 множителя
        const vipStatus = await getUserVipStatus(user);
        let vipMultiplier = 1;
        let vipMessage = '';
        
        if (vipStatus && vipStatus.isVip) {
          // 30% шанс на x2 для VIP пользователей
          const vipChance = Math.random();
          if (vipChance < 0.3) {
            vipMultiplier = 2;
            vipMessage = ' 👑 VIP x2!';
          }
        }
        
        if (bet.isBTC) {
          // BTC выплата с VIP множителем
          const btcPrize = bet.btcAmount * coef * vipMultiplier;
          prize = btcPrize;
          const currentBTC = await getUserBTC(user);
          await updateUserBTC(user, currentBTC + btcPrize);
        } else {
          // Долларовая выплата с VIP множителем
          prize = Math.floor(amount * coef * vipMultiplier);
          const currentBalance = await getUserBalance(user);
          await updateUserBalance(user, currentBalance + prize);
        }
        // Обновляем статистику игр при выигрыше
        await updateGameStats(user, 'casino', true);
        
        // Добавляем VIP сообщение к результату
        bet.vipMessage = vipMessage;
      }
      results.push({
        userId: user,
        userName: bet.userName,
        vkName: bet.vkName,
        betType: betType,
        betAmount: amount,
        won: won,
        prize: prize,
        isBTC: bet.isBTC || false,
        btcAmount: bet.btcAmount || 0,
        vipMessage: bet.vipMessage || ''
      });
    }
    // Очищаем игру
    activeGames.delete(peerId);
    return {
      success: true,
      number: number,
      results: results,
      photo: numberPhotos[number] || 'photo-230511380_457239020'
    };
  } catch (error) {
    console.error('Ошибка в endGame:', error);
    return { success: false, message: 'Ошибка при завершении игры' };
  }
}
