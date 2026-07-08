const { Keyboard } = require('vk-io');
const vk = require('../vkInstance.js');

const mafios = {};
const cache = {};

function getCache(k) { return cache[k]; }
function setCache(k, v) { cache[k] = v; }
function delCache(k) { delete cache[k]; }

function clearSelections(pid) {
  delCache(`mafia_don_selected_${pid}`);
  delCache(`komissar_maf_selected_${pid}`);
  delCache(`doctor_don_selected_${pid}`);
  delCache(`peoples_mafia_selected_${pid}`);
  delCache(`komissarCheck_maf_selected_${pid}`);
}

function deleteMafia(pid) {
  const u = getCache(`mafiaplayers_${pid}`);
  if (u) Object.keys(u).forEach(id => delCache(`mafiauser_${id}`));
  delCache(`mafiaplayers_${pid}`);
  delCache(`mafia_${pid}`);
  delCache(`skipped_hods_komissar_${pid}`);
  delCache(`skipped_hods_done_${pid}`);
  clearSelections(pid);
  delete mafios[pid];
}

async function getShortNames(ids) {
  const m = {};
  try {
    const r = await vk.api.users.get({ user_ids: ids.slice(0, 900) });
    if (r) r.forEach(u => { m[u.id] = `${(u.first_name||'?')[0]}. ${u.last_name||'?'}`; });
  } catch(e) {}
  return m;
}

function gk(names, cmds, colors) {
  const kb = Keyboard.builder();
  names.forEach((n, i) => {
    kb.callbackButton({ label: n, payload: JSON.stringify({ execute: cmds[i] }), color: colors[i] || 'secondary' });
  });
  return kb.inline();
}

function roleName(r) {
  const m = { done:'дон мафии', mafia:'мафиози', komissar:'комиссар', doctor:'доктор', people:'мирный житель', dead:'мёртв' };
  return m[r]||'неизвестно';
}

async function checkWinners(pid) {
  const u = getCache(`mafiaplayers_${pid}`);
  if (!u) return false;
  let don=false, kom=false, maf=false;
  const alive = [];
  for (const [id,d] of Object.entries(u)) {
    if (d.role!=='dead') { alive.push(+id); if (d.role==='done') don=true; if (d.role==='komissar') kom=true; if (d.role==='mafia') maf=true; }
  }
  if (alive.length<=2 || !kom || !don) {
    let win='peoples';
    if (don||(maf&&!kom)) win='mafia';
    const side = win==='mafia'?'мафиози':'мирные жители';
    let msg = `🏁 Игра завершена. Победили — ${side}!\n\n🏆 Победители:\n`;
    const all = Object.keys(u).map(Number);
    const names = await getShortNames(all);
    for (const [id,d] of Object.entries(u)) {
      const nid=+id, r=d.role==='dead'?(d.last_role||'dead'):d.role;
      if ((win==='mafia'&&(r==='done'||r==='mafia'))||(win==='peoples'&&(r==='komissar'||r==='people'||r==='doctor')))
        msg += `— ${names[nid]||'?'} (${roleName(r)})\n`;
    }
    msg += `\n👥 Проигравшие:\n`;
    for (const [id,d] of Object.entries(u)) {
      const r=d.role==='dead'?(d.last_role||'dead'):d.role;
      if (!((win==='mafia'&&(r==='done'||r==='mafia'))||(win==='peoples'&&(r==='komissar'||r==='people'||r==='doctor'))))
        msg += `— ${names[+id]||'?'} (${roleName(r)})\n`;
    }
    await vk.api.messages.send({ peer_id:pid, message:msg, random_id:0 });
    deleteMafia(pid);
    return true;
  }
  return false;
}

async function handleCallback(context) {
  const { peerId:pid, userId:uid, eventPayload:p } = context;
  let cmd = '';
  try { cmd = typeof p === 'string' ? JSON.parse(p).execute : p.execute; } catch(e) { cmd = p?.execute||''; }
  if (!cmd) return;

  // invitemaf
  if (cmd==='invitemaf') {
    let u = getCache(`mafiaplayers_${pid}`);
    if (!u || getCache(`mafia_${pid}`)!=='start') return;
    if (u[uid]) return;
    u[uid] = { role:'not' };
    setCache(`mafiaplayers_${pid}`, u);
    setCache(`mafiauser_${uid}`, String(pid));
    const nm = await getShortNames([uid]);
    await vk.api.messages.send({ peer_id:uid, message:'🚀 Вы присоединились к игре в мафию.', random_id:0 });
    await vk.api.messages.send({ peer_id:pid, message:`✅ ${nm[uid]} присоединился! 👥 ${Object.keys(u).length}`, random_id:0 });
    return;
  }

  // startmafia
  if (cmd==='startmafia') {
    if (mafios[pid] && getCache(`mafia_${pid}`)==='start') mafios[pid].date_start = Date.now()-1000;
    return;
  }

  // addmafia
  if (cmd==='addmafia') {
    if (mafios[pid]) { mafios[pid].date_start += 60000; await vk.api.messages.send({ peer_id:pid, message:'⏰ Время продлено на минуту.', random_id:0 }); }
    return;
  }

  const u = getCache(`mafiaplayers_${pid}`);
  if (!u) return;

  // mafia_don - показать кнопки
  if (cmd==='mafia_don') {
    if (u[uid]?.role!=='done' || getCache(`mafia_${pid}`)!=='night' || getCache(`mafia_don_selected_${pid}`)) return;
    const al = Object.entries(u).filter(([id,d])=>d.role!=='dead'&&+id!==uid);
    const nm = await getShortNames(al.map(a=>+a[0]));
    const kb = Keyboard.builder();
    al.forEach(([id]) => kb.callbackButton({ label: nm[id], payload: JSON.stringify({ execute: `mafia_don id${id}` }), color: 'secondary' }));
    await vk.api.messages.send({ peer_id:uid, message:'🔪 Выберите жертву:', keyboard: kb.inline(), random_id:0 });
    return;
  }

  // mafia_don idX
  if (cmd.startsWith('mafia_don id')) {
    if (getCache(`mafia_don_selected_${pid}`)) return;
    setCache(`mafia_don_selected_${pid}`, cmd.replace('mafia_don id',''));
    await vk.api.messages.send({ peer_id:uid, message:'🔪 Выбор сделан.', random_id:0 });
    return;
  }

  // mafia_doc
  if (cmd==='mafia_doc') {
    if (u[uid]?.role!=='doctor' || getCache(`mafia_${pid}`)!=='night' || getCache(`doctor_don_selected_${pid}`)) return;
    const al = Object.entries(u).filter(([id,d])=>d.role!=='dead'&&+id!==uid);
    const nm = await getShortNames(al.map(a=>+a[0]));
    const kb = Keyboard.builder();
    al.forEach(([id]) => kb.callbackButton({ label: nm[id], payload: JSON.stringify({ execute: `mafia_doc id${id}` }), color: 'secondary' }));
    await vk.api.messages.send({ peer_id:uid, message:'💊 Выберите кого лечить:', keyboard: kb.inline(), random_id:0 });
    return;
  }

  if (cmd.startsWith('mafia_doc id')) {
    if (getCache(`doctor_don_selected_${pid}`)) return;
    setCache(`doctor_don_selected_${pid}`, cmd.replace('mafia_doc id',''));
    await vk.api.messages.send({ peer_id:uid, message:'💊 Выбор сделан.', random_id:0 });
    return;
  }

  // mafia_com
  if (cmd==='mafia_com') {
    if (u[uid]?.role!=='komissar' || getCache(`mafia_${pid}`)!=='night' || getCache(`komissar_maf_selected_${pid}`)) return;
    const al = Object.entries(u).filter(([id,d])=>d.role!=='dead'&&+id!==uid);
    const nm = await getShortNames(al.map(a=>+a[0]));
    const kb = Keyboard.builder();
    al.forEach(([id]) => kb.callbackButton({ label: nm[id], payload: JSON.stringify({ execute: `mafia_com id${id}` }), color: 'secondary' }));
    await vk.api.messages.send({ peer_id:uid, message:'🕵️ Выберите цель:', keyboard: kb.inline(), random_id:0 });
    return;
  }

  if (cmd.startsWith('mafia_com id')) {
    if (getCache(`komissar_maf_selected_${pid}`)) return;
    const tid = cmd.replace('mafia_com id','');
    setCache(`komissar_maf_selected_${pid}`, tid);
    const kb = Keyboard.builder();
    kb.callbackButton({ label:'🔍 Проверить', payload: JSON.stringify({ execute: `mafia_check id${tid}` }), color: 'positive' });
    kb.callbackButton({ label:'💀 Ликвидировать', payload: JSON.stringify({ execute: `maf_kilkom id${tid}` }), color: 'negative' });
    await vk.api.messages.send({ peer_id:uid, message:'☠ Выберите действие:', keyboard: kb.inline(), random_id:0 });
    return;
  }

  // mafia_check idX
  if (cmd.startsWith('mafia_check id')) {
    const tid = Number(cmd.replace('mafia_check id',''));
    const r = u[tid]?.role||'unknown';
    const nm = await getShortNames([tid]);
    const txt = { done:'дон мафии', mafia:'мафиози', komissar:'комиссар', doctor:'доктор', people:'мирный житель', dead:'умер' }[r]||'неизвестно';
    setCache(`komissarCheck_maf_selected_${pid}`, String(tid));
    await vk.api.messages.send({ peer_id:uid, message:`${nm[tid]} — ${txt}.`, random_id:0 });
    return;
  }

  // maf_kilkom idX
  if (cmd.startsWith('maf_kilkom id')) {
    const tid = cmd.replace('maf_kilkom id','');
    const nm = await getShortNames([Number(tid)]);
    delCache(`komissarCheck_maf_selected_${pid}`);
    await vk.api.messages.send({ peer_id:uid, message:`${nm[tid]} будет ликвидирован.`, random_id:0 });
    return;
  }

  // mafia_peo
  if (cmd==='mafia_peo') {
    if (u[uid]?.role==='dead' || getCache(`mafia_${pid}`)!=='day2') return;
    const votes = getCache(`peoples_mafia_selected_${pid}`) || {};
    for (const v of Object.values(votes)) if (v.includes(uid)) return;
    const al = Object.entries(u).filter(([id,d])=>d.role!=='dead'&&+id!==uid);
    const nm = await getShortNames(al.map(a=>+a[0]));
    const kb = Keyboard.builder();
    al.forEach(([id]) => kb.callbackButton({ label: nm[id], payload: JSON.stringify({ execute: `mafia_peo id${id}` }), color: 'secondary' }));
    await vk.api.messages.send({ peer_id:uid, message:'💀 Выберите кого казнить:', keyboard: kb.inline(), random_id:0 });
    return;
  }

  if (cmd.startsWith('mafia_peo id')) {
    const tid = Number(cmd.replace('mafia_peo id',''));
    const votes = getCache(`peoples_mafia_selected_${pid}`) || {};
    for (const v of Object.values(votes)) if (v.includes(uid)) return;
    if (!votes[tid]) votes[tid] = [];
    votes[tid].push(uid);
    setCache(`peoples_mafia_selected_${pid}`, votes);
    const nm = await getShortNames([uid]);
    await vk.api.messages.send({ peer_id:pid, message:`📝 ${nm[uid]} проголосовал(а).`, random_id:0 });
    await vk.api.messages.send({ peer_id:uid, message:'✅ Голос учтён.', random_id:0 });
    return;
  }
}

module.exports = {
  command:'/mafia',
  aliases:['/мафия'],
  description:'Игра в мафию',
  async execute(context) {
    const { peerId:pid, senderId:sid } = context;
    if (getCache(`mafia_${pid}`)) return context.send('🔪 Игра в мафию уже запущена');
    setCache(`mafia_${pid}`, 'start');
    setCache(`mafiaplayers_${pid}`, {});
    mafios[pid] = { status:'start', date_start: Date.now()+120000 };
    const nm = await getShortNames([sid]);
    const kb = Keyboard.builder();
    kb.callbackButton({ label:'Присоединиться', payload: JSON.stringify({ execute:'invitemaf' }), color:'secondary' });
    kb.row();
    kb.callbackButton({ label:'Начать игру', payload: JSON.stringify({ execute:'startmafia' }), color:'negative' });
    kb.callbackButton({ label:'Добавить время', payload: JSON.stringify({ execute:'addmafia' }), color:'secondary' });
    await context.send({ message:`🔪 ${nm[sid]} предложил начать игру в мафию.\n\n👥 Игроков: 0\n⌛ Начало через: 2 мин.`, keyboard: kb.inline() });
  },
  handleCallback
};

// Автоход
setInterval(async () => {
  for (const [pid, data] of Object.entries(mafios)) {
    const id = +pid;
    const now = Date.now();
    if (data.status==='start' && now>=data.date_start) {
      const u = getCache(`mafiaplayers_${pid}`) || {};
      const pl = Object.keys(u).map(Number);
      if (pl.length<3) { await vk.api.messages.send({ peer_id:id, message:`🔪 Мало игроков (${pl.length}). Игра отменена.`, random_id:0 }); deleteMafia(id); continue; }
      const sh = pl.sort(()=>Math.random()-0.5);
      u[sh[0]]={role:'done'}; u[sh[1]]={role:'komissar'};
      const doc = pl.length>=5 ? sh[2] : 0;
      if (doc) u[doc]={role:'doctor'};
      const mi = pl.length>=7 ? [sh[doc?3:2], sh[doc?4:3]] : [sh[doc?3:2]];
      mi.forEach(x => u[x]={role:'mafia'});
      pl.filter(x => !mi.includes(x) && x!==sh[0] && x!==sh[1] && x!==doc).forEach(x => u[x]={role:'people'});
      setCache(`mafiaplayers_${pid}`, u);
      setCache(`mafia_${pid}`,'night');
      mafios[pid] = { status:'night', date_start: now+60000 };
      const nm = await getShortNames(pl);
      let msg = '🔪 Игра началась.\n\n🧔 В живых:\n';
      pl.forEach(x => msg += `— ${nm[x]}\n`);
      await vk.api.messages.send({ peer_id:id, message:msg, random_id:0 });
      for (const [x,d] of Object.entries(u)) {
        let t='';
        if (d.role==='done') t='🔪 Вы — Дон мафии.';
        else if (d.role==='komissar') t='🕵️ Вы — Комиссар.';
        else if (d.role==='doctor') t='💊 Вы — Доктор.';
        else if (d.role==='mafia') t='🔪 Вы — Мафиози.';
        else t='👤 Вы — Мирный житель.';
        try { await vk.api.messages.send({ peer_id:+x, message:t, random_id:0 }); } catch(e) {}
      }
    }
    if (data.status==='night' && now>=data.date_start) {
      const u = getCache(`mafiaplayers_${pid}`);
      if (!u) continue;
      const donS = getCache(`mafia_don_selected_${pid}`);
      const komS = getCache(`komissar_maf_selected_${pid}`);
      const komC = getCache(`komissarCheck_maf_selected_${pid}`);
      const docS = getCache(`doctor_don_selected_${pid}`);
      const killed = new Set();
      let donT = donS ? +donS : 0;
      if (!donT) {
        const sk = (Number(getCache(`skipped_hods_done_${pid}`))||0)+1;
        setCache(`skipped_hods_done_${pid}`, String(sk));
        if (sk>=2) donT = +Object.entries(u).find(([id,d])=>d.role==='done')?.[0]||0;
      }
      if (donT && donT!==+docS && u[donT]) { u[donT].last_role=u[donT].role; u[donT].role='dead'; killed.add(donT); }
      if (komS && !komC && +komS!==+docS && u[+komS]) { u[+komS].last_role=u[+komS].role; u[+komS].role='dead'; killed.add(+komS); }
      setCache(`mafiaplayers_${pid}`, u);
      setCache(`mafia_${pid}`,'day');
      mafios[pid] = { status:'day', date_start: now+60000 };
      let msg = '🌅 Наступает утро.\n\n';
      if (killed.size) {
        msg += '💀 Не выжили:\n';
        const nm = await getShortNames([...killed]);
        killed.forEach(x => msg += `— ${nm[x]}\n`);
      } else msg += '✨ Все выжили.\n';
      if (await checkWinners(id)) continue;
      msg += '\n💭 Обсуждение.';
      await vk.api.messages.send({ peer_id:id, message:msg, random_id:0 });
      clearSelections(id);
    }
    if (data.status==='day' && now>=data.date_start) {
      setCache(`mafia_${pid}`,'day2');
      mafios[pid] = { status:'day2', date_start: now+60000 };
      await vk.api.messages.send({ peer_id:id, message:'💀 Голосование! Выберите кого казнить.', random_id:0 });
    }
    if (data.status==='day2' && now>=data.date_start) {
      const u = getCache(`mafiaplayers_${pid}`);
      const votes = getCache(`peoples_mafia_selected_${pid}`) || {};
      let max=0, mid=0, tie=false;
      for (const [tid, arr] of Object.entries(votes)) {
        if (arr.length>max) { max=arr.length; mid=+tid; tie=false; }
        else if (arr.length===max) tie=true;
      }
      if (!tie && mid && u[mid]) { u[mid].last_role=u[mid].role; u[mid].role='dead'; const nm = await getShortNames([mid]); await vk.api.messages.send({ peer_id:id, message:`💀 Казнён: ${nm[mid]}`, random_id:0 }); }
      else await vk.api.messages.send({ peer_id:id, message:'Голоса разошлись.', random_id:0 });
      setCache(`mafiaplayers_${pid}`, u);
      delCache(`peoples_mafia_selected_${pid}`);
      if (await checkWinners(id)) continue;
      setCache(`mafia_${pid}`,'night');
      mafios[pid] = { status:'night', date_start: now+60000 };
      clearSelections(id);
      const al = Object.keys(u).filter(x => u[x].role!=='dead').map(Number);
      const nm = await getShortNames(al);
      let msg = '🌃 Ночь.\n\n🧔 В живых:\n';
      al.forEach(x => msg += `— ${nm[x]}\n`);
      await vk.api.messages.send({ peer_id:id, message:msg, random_id:0 });
    }
  }
}, 2000);
