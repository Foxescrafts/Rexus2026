const { Keyboard } = require('vk-io');
const { getlink } = require('../util.js');

module.exports = {
  command: '/work',
  aliases: ['/работы', '/job'],
  description: 'Меню работ',
  async execute(context) {
    const { senderId } = context;
    const userName = await getlink(senderId);
    const keyboard = Keyboard.builder()
      .callbackButton({ label: '⛏️ Шахта', payload: { command: 'work_mine', event_id: 9001 }, color: Keyboard.POSITIVE_COLOR })
      .callbackButton({ label: '✈️ Лётчик', payload: { command: 'work_pilot', event_id: 9007 }, color: Keyboard.PRIMARY_COLOR })
      .inline();

    context.send({ message: `💼 Меню работ\n👤 ${userName}`, keyboard });
  }
};
