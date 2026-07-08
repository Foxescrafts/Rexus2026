const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class TicketSystem {
    constructor(vk) {
        this.vk = vk;
        this.db = new sqlite3.Database(path.join(__dirname, 'tickets.db'));
        this.ADMIN_IDS = {};
        this.answerMode = new Map();
        this.SUPER_ADMIN = 880366434;
        this.init();
    }
    init() {
        this.db.serialize(() => {
            this.db.run('CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, from_id INTEGER, peer_id INTEGER, closed INTEGER DEFAULT 0, worker INTEGER DEFAULT 0, close_id INTEGER DEFAULT 0, mark INTEGER DEFAULT -1, last_activity TEXT, create_time TEXT, close_time TEXT)');
            this.db.run('CREATE TABLE IF NOT EXISTS reports_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, report_id INTEGER, from_id INTEGER, message TEXT, is_worker INTEGER DEFAULT 0, date_created TEXT)');
            this.db.run('CREATE TABLE IF NOT EXISTS banreports (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, active INTEGER DEFAULT 1, admin_id INTEGER, reason TEXT, date_unban TEXT, date_created TEXT)');
        });
        this.loadAdmins();
    }
    async loadAdmins() {
        try {
            const db = require('../databases.js');
            const q = require('util').promisify(db.query);
            const admins = await q('SELECT userid FROM sysadmins WHERE access >= 1');
            if (admins) admins.forEach(a => this.ADMIN_IDS[a.userid] = a);
        } catch(e) {}
    }
    now() { return new Date().toISOString().replace('T',' ').substring(0,19); }
    isAdmin(id) { return id === this.SUPER_ADMIN || !!this.ADMIN_IDS[id]; }
    hasPerm(id) { return this.isAdmin(id); }

    async msg(pid, text, kb) {
        try {
            const p = { peer_id: pid, message: text, random_id: Math.floor(Math.random()*999999) };
            if (kb) p.keyboard = JSON.stringify(kb);
            await this.vk.api.messages.send(p);
        } catch(e) {}
    }
    async reply(ctx, text, kb) {
        try {
            const p = { message: text };
            if (kb) p.keyboard = JSON.stringify(kb);
            await ctx.send(p);
        } catch(e) {}
    }

    kb(rid) {
        return { inline:true, buttons:[[
            { action:{type:'callback',label:'Информация',payload:{command:'getreport '+rid}},color:'secondary'},
            { action:{type:'callback',label:'Диалог',payload:{command:'getdialog '+rid}},color:'secondary'},
            { action:{type:'callback',label:'Взять на рассмотрение',payload:{command:'open '+rid}},color:'positive'}
        ]] };
    }
    kbAnswer(rid) {
        return { inline:true, buttons:[[
            { action:{type:'callback',label:'Выйти',payload:{command:'answer_exit'}},color:'positive'},
            { action:{type:'callback',label:'Закрыть',payload:{command:'close '+rid}},color:'negative'}
        ]] };
    }
    kbRate(rid) {
        return { inline:true, buttons:[[
            { action:{type:'callback',label:'1',payload:{command:'markrep '+rid+' 1'}},color:'negative'},
            { action:{type:'callback',label:'2',payload:{command:'markrep '+rid+' 2'}},color:'negative'},
            { action:{type:'callback',label:'3',payload:{command:'markrep '+rid+' 3'}},color:'secondary'},
            { action:{type:'callback',label:'4',payload:{command:'markrep '+rid+' 4'}},color:'primary'},
            { action:{type:'callback',label:'5',payload:{command:'markrep '+rid+' 5'}},color:'positive'}
        ]] };
    }

    async reportInsert(fid, pid) {
        const t = this.now();
        return new Promise(r => this.db.run('INSERT INTO reports (from_id,peer_id,last_activity,create_time) VALUES (?,?,?,?)', [fid,pid,t,t], function(e) { r(e ? null : this.lastID); }));
    }
    async reportGet(id) {
        return new Promise(r => this.db.get('SELECT * FROM reports WHERE id=?', [id], (e,row) => r(row||null)));
    }
    async reportGetByUser(uid) {
        return new Promise(r => this.db.get('SELECT * FROM reports WHERE from_id=? AND closed=0', [uid], (e,row) => r(row||null)));
    }
    async reportsGetAllOpened() {
        return new Promise(r => this.db.all('SELECT * FROM reports WHERE closed=0 ORDER BY last_activity DESC LIMIT 20', [], (e,rows) => r(rows||[])));
    }
    async reportMessagesGet(rid) {
        return new Promise(r => this.db.all('SELECT * FROM reports_messages WHERE report_id=? ORDER BY id ASC LIMIT 50', [rid], (e,rows) => r(rows||[])));
    }
    async reportAddMessage(rid, fid, msg, isw) {
        return new Promise(r => this.db.run('INSERT INTO reports_messages (report_id,from_id,message,is_worker,date_created) VALUES (?,?,?,?,?)', [rid,fid,msg,isw||0,this.now()], function(e) { r(e?null:this.lastID); }));
    }
    async reportSetClose(rid, cl, aid) {
        const t = cl ? this.now() : null;
        return new Promise(r => this.db.run('UPDATE reports SET closed=?,close_id=?,close_time=?,last_activity=? WHERE id=?', [cl,aid,t,this.now(),rid], (e) => r(!e)));
    }
    async reportSetWorker(rid, wid) {
        return new Promise(r => this.db.run('UPDATE reports SET worker=?,last_activity=? WHERE id=?', [wid,this.now(),rid], (e) => r(!e)));
    }
    async BanreportsGetBan(uid) {
        return new Promise(r => this.db.get('SELECT * FROM banreports WHERE user_id=? AND active=1', [uid], (e,row) => r(row||null)));
    }

    // КОМАНДЫ (текст 1 в 1 из Grand ls_cmds.cs)
    async cmdReport(ctx) {
        const uid = ctx.senderId, pid = ctx.peerId;
        const text = ctx.text.split(' ').slice(1).join(' ').trim();
        if (!text) return this.reply(ctx, '/report [текст]');
        const ban = await this.BanreportsGetBan(uid);
        if (ban) return this.reply(ctx, 'Доступ к тикетам для Вас был ограничен.');
        let rep = await this.reportGetByUser(uid);
        if (!rep) {
            const nid = await this.reportInsert(uid, pid);
            rep = await this.reportGet(nid);
            if (!rep) return this.reply(ctx, 'Произошла ошибка создания тикета. Попробуйте позже.');
            await this.reportAddMessage(rep.id, uid, text);
            await this.reply(ctx, 'Тикет #' + rep.id + ' успешно создан. Ваше обращение передано администраторам.\nОтвет на ваш тикет придёт в эту беседу как только администраторы ответят на него.');
            const reps = await this.reportsGetAllOpened();
            for (const aid of Object.keys(this.ADMIN_IDS)) {
                await this.msg(aid, 'Внимание! Новый тикет (' + rep.id + '). Всего актуальных тикетов: ' + reps.length, this.kb(rep.id));
            }
        } else {
            if (rep.closed) return this.reply(ctx, 'Тикет уже закрыт.');
            await this.reportAddMessage(rep.id, uid, text);
            await this.reply(ctx, 'Тикет #' + rep.id + ' был успешно дополнен.\nОтвет на ваш тикет придёт в эту беседу как только администраторы ответят на него.');
            if (rep.worker) await this.msg(rep.worker, 'Тикет #' + rep.id + ' был дополнен пользователем!\nОбратите внимание, это ваш тикет.', this.kb(rep.id));
        }
    }

    async cmdReports(ctx) {
        if (!this.isAdmin(ctx.senderId)) return;
        const reps = await this.reportsGetAllOpened();
        if (!reps.length) return this.reply(ctx, 'На данный момент нет открытых тикетов.');
        let t = 'Открытые тикеты:\n\n';
        for (const r of reps) t += '#' + r.id + '. @id' + r.from_id + ' | Последняя активность: ' + r.last_activity + '\n';
        t += '\nДля подробного просмотра тикета используйте команду /getreport';
        this.reply(ctx, t);
    }

    async cmdGetReport(ctx) {
    const uid = ctx.senderId || ctx.userId;
        const id = parseInt(ctx.text.split(' ')[1]) || (await this.reportGetByUser(uid))?.id;
        if (!id) return this.reply(ctx, '/getreport [id]');
        const rep = await this.reportGet(id);
        if (!rep) return this.reply(ctx, 'Введён неправильный ID тикета.');
        let t = 'Информация о тикете #' + rep.id + ':\n\n';
        t += 'Отправитель: @id' + rep.from_id + '\n';
        t += 'Конференция: ' + (rep.peer_id || '—') + '\n';
        t += 'Закрыт? — ' + (rep.closed ? 'да' : 'нет') + '\n';
        t += 'Рассматривает: ' + (rep.worker ? 'Администратор #' + rep.worker : 'ожидает рассмотрения.') + '\n';
        t += 'Последняя активность: ' + (rep.last_activity || '—');
        if (this.isAdmin(uid) && !rep.closed) await this.reply(ctx, t, this.kb(rep.id));
        else await this.reply(ctx, t);
    }

    async cmdGetDialog(ctx) {
        if (!this.isAdmin(ctx.senderId)) return;
        const id = parseInt(ctx.text.split(' ')[1]);
        if (!id) return this.reply(ctx, '/getdialog [id]');
        const rep = await this.reportGet(id);
        if (!rep) return this.reply(ctx, 'Введён неправильный ID тикета.');
        const msgs = await this.reportMessagesGet(id);
        if (!msgs.length) return this.reply(ctx, 'В тикете нет сообщений.');
        let t = 'Показаны последние ' + msgs.length + ' сообщений.\n\n';
        for (const m of msgs) t += m.date_created + ' | ' + (m.is_worker ? 'Админ' : 'Клиент') + ': ' + m.message + '\n';
        t += '\nДля отправки сообщения вам необходимо ввести команду /answer ' + id;
        this.reply(ctx, t, this.kb(rep.id));
    }

    async cmdOpenReport(ctx) {
    const uid = ctx.senderId || ctx.userId;
        if (!this.isAdmin(uid)) return;
        const id = parseInt(ctx.text.split(' ')[1]);
        if (!id) return this.reply(ctx, '/open [id]');
        const rep = await this.reportGet(id);
        if (!rep) return this.reply(ctx, 'Введён неправильный ID тикета.');
        if (rep.worker && rep.worker != uid) return this.reply(ctx, 'Данный тикет уже рассматривает Администратор #' + rep.worker);
        await this.reportSetWorker(id, uid);
    try { const fs = require("fs"); const path = require("path"); const f = path.join(__dirname, "..", "data", "sysadmins", uid + ".json"); if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f, "utf8")); d.answers = (d.answers || 0) + 1; fs.writeFileSync(f, JSON.stringify(d)); } } catch(e) {}
        await this.reply(ctx, 'Тикет #' + id + ' был взят на рассмотрение.\nДля получения диалога используйте /getdialog ' + id);
        if (rep.peer_id > 2000000000) await this.msg(rep.peer_id, '@id' + rep.from_id + ', Ваш тикет #' + id + ' был взят на рассмотрение Администратором.\n\nОтвет на тикет придёт в эту беседу как только Администратор ответит на него.');
    }

    async cmdAnswer(ctx) {
    const uid = ctx.senderId || ctx.userId;
        if (!this.isAdmin(uid)) return;
        const id = parseInt(ctx.text.split(' ')[1]);
        if (!id) return this.reply(ctx, '/answer [id]');
        const rep = await this.reportGet(id);
        if (!rep || rep.closed) return this.reply(ctx, 'Тикет не найден или закрыт.');
        if (!rep.worker) { await this.reportSetWorker(id, uid); }
    try { const fs = require("fs"); const path = require("path"); const f = path.join(__dirname, "..", "data", "sysadmins", uid + ".json"); if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f, "utf8")); d.answers = (d.answers || 0) + 1; fs.writeFileSync(f, JSON.stringify(d)); } } catch(e) {}
        this.answerMode.set(uid, id);
        await this.reply(ctx, 'Вы перемещены в диалог с пользователем. Все последующие ваши сообщения будут отправлены в тикет.\n\nДля отмены вам необходимо нажать на кнопку «Выйти» либо ввести команду /exit', this.kbAnswer(id));
    }

    async handleAnswerMessage(ctx) {
    const uid = ctx.senderId || ctx.userId;
        if (!this.answerMode.has(uid)) return false;
        const text = ctx.text;
        if (!text || text === '/exit') {
            this.answerMode.delete(uid);
            await this.reply(ctx, 'Вы вернулись обратно в диалог с ботом. Сообщения больше не отправляются в тикет.');
            return true;
        }
        const rid = this.answerMode.get(uid);
        const rep = await this.reportGet(rid);
        if (!rep || rep.closed) { this.answerMode.delete(uid); return false; }
        await this.reportAddMessage(rid, uid, text, 1);
        const num = Object.keys(this.ADMIN_IDS).indexOf(String(uid)) + 1;
        if (rep.peer_id > 2000000000) {
            await this.msg(rep.peer_id, '———————————————\n@id' + rep.from_id + ', Ваш тикет #' + rid + ' был обновлен.\n\n💭 Сообщение Администратора #' + num + ':\n' + text + '\n\n———————————————');
        } else {
            await this.msg(rep.from_id, 'Администратор #' + num + ' (тикет #' + rid + '): ' + text);
        }
        await this.reply(ctx, 'Тикет #' + rid + ' был обновлён, сообщение было отправлено.\nВы ещё находитесь в диалоге с пользователем. Все сообщения будут отправлены в тикет.\n\nДля выхода используйте /answer или /exit', this.kbAnswer(rid));
        return true;
    }

    async cmdCloseReport(ctx) {
    const uid = ctx.senderId || ctx.userId;
        if (!this.isAdmin(uid)) return;
        const id = parseInt(ctx.text.split(' ')[1]);
        if (!id) return this.reply(ctx, '/close [id]');
        const rep = await this.reportGet(id);
        if (!rep) return this.reply(ctx, 'Введён неправильный ID тикета.');
        this.answerMode.delete(uid);
        await this.reportSetClose(id, 1, uid);
        await this.reply(ctx, 'Тикет #' + id + ' был закрыт.', this.kbRate(id));
        if (rep.peer_id > 2000000000) {
            await this.msg(rep.peer_id, '@id' + rep.from_id + ', Ваш тикет #' + id + ' был закрыт Администратором.\n\nЕсли у вас остались вопросы — откройте новый тикет командой /report.\n\nОцените ответ администратора от 1 до 5.', this.kbRate(id));
        } else {
            await this.msg(rep.from_id, 'Ваш тикет #' + id + ' был закрыт Администратором.\n\nЕсли у вас остались вопросы — откройте новый тикет командой /report.\n\nОцените ответ администратора от 1 до 5.', this.kbRate(id));
        }
    }

    async handlePayload(ctx) {
        const p = ctx.eventPayload || ctx.messagePayload;
        if (!p || !p.command) return false;
        const cmd = p.command;
        const parts = cmd.split(' ');
        const action = parts[0];
    const uid = ctx.senderId || ctx.userId;

        if (action === 'answer_exit') { this.answerMode.delete(ctx.senderId || ctx.userId); await this.reply(ctx, 'Вы вернулись обратно в диалог с ботом. Сообщения больше не отправляются в тикет.'); return true; }
        if (action === 'close' && parts[1]) {
            const id = parseInt(parts[1]);
            const rep = await this.reportGet(id);
            if (rep) {
                this.answerMode.delete(uid);
                await this.reportSetClose(id, 1, uid);
                await this.reply(ctx, 'Тикет #' + id + ' был закрыт.', this.kbRate(id));
                if (rep.peer_id > 2000000000) {
                    await this.msg(rep.peer_id, '@id' + rep.from_id + ', Ваш тикет #' + id + ' был закрыт Администратором.\n\nЕсли у вас остались вопросы — откройте новый тикет командой /report.\n\nОцените ответ администратора от 1 до 5.', this.kbRate(id));
                } else {
                    await this.msg(rep.from_id, 'Ваш тикет #' + id + ' был закрыт Администратором.\n\nЕсли у вас остались вопросы — откройте новый тикет командой /report.\n\nОцените ответ администратора от 1 до 5.', this.kbRate(id));
                }
            }
            return true;
        }
        if (action === 'open' && parts[1]) {
            const id = parseInt(parts[1]);
            const rep = await this.reportGet(id);
            if (rep) {
                await this.reportSetWorker(id, uid);
    try { const fs = require("fs"); const path = require("path"); const f = path.join(__dirname, "..", "data", "sysadmins", uid + ".json"); if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f, "utf8")); d.answers = (d.answers || 0) + 1; fs.writeFileSync(f, JSON.stringify(d)); } } catch(e) {}
                await this.reply(ctx, 'Тикет #' + id + ' был взят на рассмотрение.\nДля получения диалога используйте /getdialog ' + id);
                if (rep.peer_id > 2000000000) await this.msg(rep.peer_id, '@id' + rep.from_id + ', Ваш тикет #' + id + ' был взят на рассмотрение Администратором.\n\nОтвет на тикет придёт в эту беседу как только Администратор ответит на него.');
            }
            return true;
        }
        if (action === 'getreport' && parts[1]) {
            const rep = await this.reportGet(parseInt(parts[1]));
            if (rep) {
                let t = 'Информация о тикете #' + rep.id + ':\n\n';
                t += 'Отправитель: @id' + rep.from_id + '\n';
                t += 'Закрыт? — ' + (rep.closed ? 'да' : 'нет') + '\n';
                t += 'Рассматривает: ' + (rep.worker ? 'Администратор #' + rep.worker : 'ожидает рассмотрения.');
                await this.reply(ctx, t, this.kb(rep.id));
            }
            return true;
        }
        if (action === 'getdialog' && parts[1]) {
            const rep = await this.reportGet(parseInt(parts[1]));
            if (rep) {
                const msgs = await this.reportMessagesGet(rep.id);
                let t = 'Показаны последние ' + msgs.length + ' сообщений.\n\n';
                for (const m of msgs) t += m.date_created + ' | ' + (m.is_worker ? 'Админ' : 'Клиент') + ': ' + m.message + '\n';
                t += '\nДля отправки сообщения вам необходимо ввести команду /answer ' + rep.id;
                this.reply(ctx, t, this.kb(rep.id));
            }
            return true;
        }
        if (action === 'markrep' && parts[1] && parts[2]) {
            const rid = parseInt(parts[1]);
            const rep = await this.reportGet(rid);
            if (rep && rep.from_id !== uid) { await this.reply(ctx, 'Только автор тикета может оценить ответ.'); return true; }
            await this.db.run('UPDATE reports SET mark=? WHERE id=?', [parseInt(parts[2]), parseInt(parts[1])]);
    if (rep && rep.worker) { try { const db = require("../databases.js"); const q = require("util").promisify(db.query); await q("UPDATE sysadmins SET marks = marks + ? WHERE userid = ?", [parseInt(parts[2]), rep.worker]); } catch(e) {} }
            await this.reply(ctx, 'Спасибо за оценку!');
            return true;
        }
        return false;
    }
}

module.exports = TicketSystem;
