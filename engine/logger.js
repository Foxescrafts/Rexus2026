// Логирование действий (как в Grand logs)
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'data', 'logs');
        if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    log(peerId, type, userId, targetId, text, data1, data2) {
        const now = new Date().toISOString();
        const file = path.join(this.logDir, `logs_${peerId}.json`);
        let logs = [];
        try { if (fs.existsSync(file)) logs = JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) {}
        logs.push({ peerId, type, userId, targetId, text, data1, data2, date: now });
        fs.writeFileSync(file, JSON.stringify(logs, null, 2));
    }
}

module.exports = new Logger();
