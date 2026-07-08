const vk = require('../vkInstance.js');
const fs = require('fs');
const path = require('path');

const TICKETS_DIR = path.join(__dirname, '..', 'data', 'tickets');
const RATINGS_FILE = path.join(__dirname, '..', 'data', 'ticket_ratings.json');

function readTicket(id) { try { return JSON.parse(fs.readFileSync(path.join(TICKETS_DIR, id + '.json'), 'utf8')); } catch { return null; } }
function readRatings() { try { return JSON.parse(fs.readFileSync(RATINGS_FILE, 'utf8')); } catch { return {}; } }
function writeRatings(d) { fs.writeFileSync(RATINGS_FILE, JSON.stringify(d, null, 2)); }

module.exports = {
  command: '/rate',
  aliases: ['/оценка', '/отзыв'],
  description: 'Оценить тикет (1-10)',
  async execute(context) {
    const parts = String(context.text || '').trim().split(/\s+/);
    const ticketId = parseInt(parts[1]);
    const score = parseInt(parts[2]);
    const comment = parts.slice(3).join(' ') || '';

    if (!ticketId || !score || score < 1 || score > 10) return context.reply('❌ /rate [ID тикета] [1-10] [комментарий]');

    const ticket = readTicket(ticketId);
    if (!ticket) return context.reply('❌ Тикет не найден.');
    if (String(ticket.userid) !== String(context.senderId)) return context.reply('⛔ Только автор тикета может оценить.');

    const ratings = readRatings();
    if (!ratings[ticketId]) ratings[ticketId] = [];
    ratings[ticketId].push({ userId: context.senderId, score, comment, date: Date.now() });
    writeRatings(ratings);

    let employeeLine = '';
    if (ticket.closed_by) {
      try {
        const u = await vk.api.users.get({ user_ids: [ticket.closed_by] });
        if (u[0]) employeeLine = `\n👤 Оценка для [id${u[0].id}|${u[0].first_name} ${u[0].last_name}]`;
      } catch {}
    }

    return context.reply(`✅ Спасибо за оценку!\n⭐ Тикет #${ticketId}: ${score}/10${comment ? `\n💬 ${comment}` : ''}${employeeLine}`);
  }
};
