// Модуль для нумерации агентов поддержки
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'agent_counter.json');

function getCounters() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}
function saveCounters(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function getAgentNumber(userId) {
  const counters = getCounters();
  if (!counters[userId]) {
    // Найти максимальный номер
    const maxNum = Object.values(counters).reduce((max, v) => Math.max(max, v), 0);
    counters[userId] = maxNum + 1;
    saveCounters(counters);
  }
  return counters[userId];
}

module.exports = { getAgentNumber };
