module.exports = { command: '/mafia_don', async execute(ctx) { await require('./mafia.js').donAction(ctx); } };
