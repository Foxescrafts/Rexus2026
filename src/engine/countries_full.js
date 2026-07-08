// ПОЛНЫЙ порт game_cmd_country, game_cmd_mycountry, game_cmd_mcountry, game_cmd_getcountries из Grand
const sqlite3 = require('sqlite3').verbose();

class CountriesFull {
    constructor(db) {
        this.db = db;
        this.init();
    }

    init() {
        this.db.run(`CREATE TABLE IF NOT EXISTS countries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT '', short_name TEXT DEFAULT '',
            owner INTEGER DEFAULT 0, rubles TEXT DEFAULT '0', dollars TEXT DEFAULT '0', euros TEXT DEFAULT '0',
            members INTEGER DEFAULT 0, area INTEGER DEFAULT 0,
            tax_income INTEGER DEFAULT 10, tax_vat INTEGER DEFAULT 20, tax_services INTEGER DEFAULT 5, tax_kazino INTEGER DEFAULT 15,
            date_tax TEXT DEFAULT '', average_zp TEXT DEFAULT '25000',
            transport_minibuses INTEGER DEFAULT 0, transport_buses INTEGER DEFAULT 0, transport_trolleybuses INTEGER DEFAULT 0,
            transport_trans INTEGER DEFAULT 0, transport_metro INTEGER DEFAULT 0,
            medicine_level INTEGER DEFAULT 0, factories_level INTEGER DEFAULT 0, education_level INTEGER DEFAULT 0, army_level INTEGER DEFAULT 0
        )`);
        this.db.get('SELECT COUNT(*) as cnt FROM countries', [], (e, r) => {
            if (r && r.cnt === 0) {
                this.db.run(`INSERT INTO countries (name, short_name, rubles, dollars, euros, area, tax_income, tax_vat, tax_services, tax_kazino, members) VALUES ('Российская Федерация','Россия','500000','10000','5000',17125000,13,20,10,15,5)`);
                this.db.run(`INSERT INTO countries (name, short_name, rubles, dollars, euros, area, tax_income, tax_vat, tax_services, tax_kazino, members) VALUES ('США','Америка','300000','50000','20000',9834000,15,10,8,20,3)`);
                this.db.run(`INSERT INTO countries (name, short_name, rubles, dollars, euros, area, tax_income, tax_vat, tax_services, tax_kazino, members) VALUES ('Германия','Германия','200000','15000','10000',357000,20,19,12,18,4)`);
            }
        });
    }

    now() { return new Date().toISOString().replace('T',' ').substring(0,19); }
    timeGetForMysql(str) { try { return new Date(str.replace(' ','T') + 'Z'); } catch { return new Date(); } }

    GetCountry(id) { return new Promise(r => this.db.get('SELECT * FROM countries WHERE id=?',[id],(e,row)=>r(row||null))); }
    GetAll() { return new Promise(r => this.db.all('SELECT * FROM countries ORDER BY id',[],(e,rows)=>r(rows||[]))); }
    GetByOwner(uid) { return new Promise(r => this.db.get('SELECT * FROM countries WHERE owner=?',[uid],(e,row)=>r(row||null))); }
    GetByUser(uid) { return new Promise(r => this.db.get('SELECT c.* FROM countries c JOIN accounts a ON a.country=c.id WHERE a.userid=?',[uid],(e,row)=>r(row||null))); }
    Create(name, owner) { return new Promise(r => this.db.run('INSERT INTO countries (name,short_name,owner,rubles,dollars,euros,area) VALUES (?,?,?,?,?,?,?)',[name,name.substring(0,10),owner,'100000','1000','500',1000],function(e){r(e?null:this.lastID)})); }
    SetOwner(cid, uid) { return new Promise(r => this.db.run('UPDATE countries SET owner=?,members=members+1 WHERE id=?',[uid,cid],(e)=>r(!e))); }
    SetRub(cid, rub) { return new Promise(r => this.db.run('UPDATE countries SET rubles=? WHERE id=?',[rub,cid],(e)=>r(!e))); }
    SetTaxLast(cid, date) { return new Promise(r => this.db.run('UPDATE countries SET date_tax=? WHERE id=?',[date,cid],(e)=>r(!e))); }

    async CollectTaxes(countryId) {
        const c = await this.GetCountry(countryId); if (!c) return { error: 'Страна не найдена' };
        const now = Math.floor(Date.now()/1000);
        const last = c.date_tax ? Math.floor(this.timeGetForMysql(c.date_tax).getTime()/1000) : 0;
        if (now < last + 86400) return { error: 'Налоги можно будет собрать: ' + new Date((last+86400)*1000).toLocaleString() };
        let days = Math.floor((now - last)/86400); if (days > 31) days = 31; if (days < 1) days = 1;
        const avgZp = parseFloat(c.average_zp)||25000;
        const tax = Math.floor(avgZp * (c.tax_income||10)/100 * (c.members||1) * days * 0.3);
        const newBal = (BigInt(c.rubles||0) + BigInt(tax)).toString();
        await this.SetRub(countryId, newBal); await this.SetTaxLast(countryId, this.now());
        return { success:true, days, tax:tax.toString(), newBalance:newBal, nextTax:new Date((now+86400)*1000).toLocaleString() };
    }

    async UpgradeInfra(cid, type) {
        const c = await this.GetCountry(cid); if (!c) return { error: 'Страна не найдена' };
        const prices = { minibuses:30000, buses:50000, trolleybuses:60000, trans:80000, metro:120000, med:75000, zav:100000, obr:60000 };
        const price = prices[type]||50000;
        if (BigInt(c.rubles||0) < BigInt(price)) return { error: 'Недостаточно средств. Нужно: '+price.toLocaleString()+' RUB' };
        const fields = { minibuses:'transport_minibuses', buses:'transport_buses', trolleybuses:'transport_trolleybuses', trans:'transport_trans', metro:'transport_metro', med:'medicine_level', zav:'factories_level', obr:'education_level' };
        const field = fields[type];
        const newLevel = (c[field]||0) + 1;
        const newBal = (BigInt(c.rubles||0) - BigInt(price)).toString();
        await this.db.run('UPDATE countries SET '+field+'=?, rubles=? WHERE id=?', [newLevel, newBal, cid]);
        const names = { minibuses:'🚐 Маршрутки', buses:'🚎 Автобусы', trolleybuses:'🚋 Троллейбусы', trans:'🚊 Трамваи', metro:'🚇 Метро', med:'⚕ Медицина', zav:'🏗 Заводы', obr:'🎓 Образование' };
        return { success:true, name:names[type], level:newLevel, balance:newBal };
    }

    async SetTaxRate(cid, type, value) {
        const fields = { income:'tax_income', vat:'tax_vat', services:'tax_services', kazino:'tax_kazino' };
        const field = fields[type]; if (!field) return { error: 'Неверный тип налога' };
        if (value < 0 || value > 50) return { error: 'Ставка от 0 до 50%' };
        await this.db.run('UPDATE countries SET '+field+'=? WHERE id=?', [value, cid]);
        return { success:true };
    }
}

module.exports = CountriesFull;
