module.exports = { command: '/mafia_kom', async execute(ctx) { await require('./mafia.js').komAction(ctx); } };
