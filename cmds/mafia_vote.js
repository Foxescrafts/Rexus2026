module.exports = { command: '/mafia_vote', async execute(ctx) { await require('./mafia.js').voteAction(ctx); } };
