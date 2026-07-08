module.exports = { command: '/mafia_doc', async execute(ctx) { await require('./mafia.js').docAction(ctx); } };
