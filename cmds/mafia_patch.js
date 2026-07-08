// Патч для mafia.js — заменяет строки 57-76 на версию с именами в кнопках
const fs = require('fs');
const path = require('path');
const { getlink } = require('../util.js');

async function patch() {
  let code = fs.readFileSync(path.join(__dirname, 'mafia.js'), 'utf8');
  
  const oldBlock = /for \(const \[id, d\] of Object\.entries\(pl\)\) \{[\s\S]*?\n      \}/;
  const newBlock = `for (const [id, d] of Object.entries(pl)) {
        if (d.role === "done") {
          const kb = Keyboard.builder();
          for (const [id2, d2] of Object.entries(pl)) {
            if (d2.role !== "dead" && Number(id2) !== Number(id)) {
              const name = (await getlink(Number(id2))).replace(/\\[|\\]/g, '').slice(0, 30);
              kb.callbackButton({ label: name, payload: { event_id: 7901, cmd: "mafia_don", target: id2, peerId }, color: Keyboard.NEGATIVE_COLOR });
            }
          }
          kb.inline();
          await sendLS(Number(id), rt[d.role], kb);
        } else if (d.role === "komissar") {
          const kb = Keyboard.builder();
          for (const [id2, d2] of Object.entries(pl)) {
            if (d2.role !== "dead" && Number(id2) !== Number(id)) {
              const name = (await getlink(Number(id2))).replace(/\\[|\\]/g, '').slice(0, 30);
              kb.callbackButton({ label: name, payload: { event_id: 7901, cmd: "mafia_komissar", target: id2, peerId }, color: Keyboard.NEGATIVE_COLOR });
            }
          }
          kb.inline();
          await sendLS(Number(id), rt[d.role], kb);
        } else if (d.role === "doctor") {
          const kb = Keyboard.builder();
          for (const [id2, d2] of Object.entries(pl)) {
            if (d2.role !== "dead" && Number(id2) !== Number(id)) {
              const name = (await getlink(Number(id2))).replace(/\\[|\\]/g, '').slice(0, 30);
              kb.callbackButton({ label: name, payload: { event_id: 7901, cmd: "mafia_doctor", target: id2, peerId }, color: Keyboard.POSITIVE_COLOR });
            }
          }
          kb.inline();
          await sendLS(Number(id), rt[d.role], kb);
        } else {
          await sendLS(Number(id), rt[d.role]);
        }
      }`;
  
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync(path.join(__dirname, 'mafia.js'), code);
  console.log('Патч применён');
}
patch();
