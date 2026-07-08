const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Countries {
    constructor(db) {
        this.db = db;
        this.init();
    }

    init() {
        this.db.run(`CREATE TABLE IF NOT EXISTS countries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT '',
            short_name TEXT DEFAULT '',
            owner INTEGER DEFAULT 0,
            rubles TEXT DEFAULT '0',
            dollars TEXT DEFAULT '0',
            euros TEXT DEFAULT '0',
            members INTEGER DEFAULT 0,
            area INTEGER DEFAULT 0,
            tax_income INTEGER DEFAULT 10,
            tax_vat INTEGER DEFAULT 20,
            tax_services INTEGER DEFAULT 5,
            tax_kazino INTEGER DEFAULT 15
        )`);
        this.db.get('SELECT COUNT(*) as cnt FROM countries', [], (e, r) => {
            if (r && r.cnt === 0) {
                this.db.run(`INSERT INTO countries (name, short_name, rubles, dollars, euros, area) VALUES ('Россия', 'РФ', '500000', '10000', '5000', 17125000)`);
                this.db.run(`INSERT INTO countries (name, short_name, rubles, dollars, euros, area) VALUES ('США', 'USA', '300000', '50000', '20000', 9834000)`);
                this.db.run(`INSERT INTO countries (name, short_name, rubles, dollars, euros, area) VALUES ('Германия', 'DE', '200000', '15000', '10000', 357000)`);
            }
        });
    }

    CountriesGetCountry(id) { return new Promise(r => this.db.get('SELECT * FROM countries WHERE id=?', [id], (e, row) => r(row || null))); }
    CountriesGetAll() { return new Promise(r => this.db.all('SELECT * FROM countries ORDER BY id', [], (e, rows) => r(rows || []))); }
    SetOwner(countryId, userId) { return new Promise(r => this.db.run('UPDATE countries SET owner=? WHERE id=?', [userId, countryId], (e) => r(!e))); }
    CreateCountry(name, owner) { return new Promise(r => this.db.run('INSERT INTO countries (name, short_name, owner, rubles, dollars, euros, area) VALUES (?,?,?,?,?,?,?)', [name, name.substring(0,10), owner, '100000', '1000', '500', 1000], function(e) { r(e ? null : this.lastID); })); }
    GetUserCountry(userId) { return new Promise(r => this.db.get('SELECT * FROM countries WHERE owner=?', [userId], (e, row) => r(row || null))); }
    UsersSetCountry(userId, countryId) { return new Promise(r => this.db.run('UPDATE accounts SET country=? WHERE userid=?', [countryId, userId], (e) => r(!e))); }
}

module.exports = Countries;
