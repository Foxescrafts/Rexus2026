// Антифлуд 1 в 1 из Grand (AntiFlood.cs)
class AntiFlood {
    constructor(vk) {
        this.vk = vk;
        this.cache = new Map();
    }

    caseSeconds(seconds) {
        const s = Number(seconds);
        const result = (s % 100 > 20) ? s % 10 : s % 20;
        if (result === 1) return s + ' секунду';
        if (result >= 2 && result <= 4) return s + ' секунды';
        return s + ' секунд';
    }

    async checkCommand(userId, peerId, command, timeout = 5) {
        const key = 'af_' + userId + '_' + peerId;
        const currentTime = Math.floor(Date.now() / 1000);
        const nextCmd = currentTime + timeout;

        let cacheInfo = this.cache.get(key);
        if (!cacheInfo) {
            cacheInfo = { [command]: nextCmd };
            this.cache.set(key, cacheInfo);
            return true;
        }

        if (!cacheInfo[command]) {
            cacheInfo[command] = nextCmd;
            cacheInfo[command + '_send'] = 1;
            this.cache.set(key, cacheInfo);
            return true;
        }

        const cmdTime = cacheInfo[command];
        if (cmdTime <= currentTime) {
            delete cacheInfo[command];
            this.cache.set(key, cacheInfo);
            return true;
        }

        // VIP пользователи имеют половинный кулдаун
        try {
            const db = require('../databases.js');
            const q = require('util').promisify(db.query);
            const vip = await q('SELECT vip_type FROM accounts WHERE userid = ?', [userId]);
            if (vip && vip[0] && vip[0].vip_type > 0) {
                const cmdTimeVIP = Math.floor(cmdTime / 2);
                if (cmdTimeVIP <= currentTime) {
                    delete cacheInfo[command];
                    this.cache.set(key, cacheInfo);
                    return true;
                }
            }
        } catch(e) {}

        if (!cacheInfo[command + '_send']) {
            const cmdWait = cmdTime - currentTime;
            const textWait = this.caseSeconds(cmdWait);
            const nick = userId > 0 ? `[id${userId}|Вам]` : `[club${Math.abs(userId)}|Вам]`;
            this.vk.api.messages.send({ peer_id: peerId, message: nick + ' нельзя так часто использовать данную команду. Подождите ' + textWait, random_id: Math.floor(Math.random()*999999) });
            cacheInfo[command + '_send'] = 1;
            this.cache.set(key, cacheInfo);
            return false;
        } else {
            const trys = cacheInfo[command + '_send'];
            if (trys <= 1) {
                const cmdWait = cmdTime - currentTime;
                const textWait = this.caseSeconds(cmdWait);
                const nick = userId > 0 ? `[id${userId}|Вам]` : `[club${Math.abs(userId)}|Вам]`;
                this.vk.api.messages.send({ peer_id: peerId, message: nick + ' нельзя так часто использовать данную команду. Подождите ' + textWait, random_id: Math.floor(Math.random()*999999) });
                cacheInfo[command + '_send'] = trys + 1;
                this.cache.set(key, cacheInfo);
                return false;
            }
        }

        return false;
    }
}

module.exports = AntiFlood;
