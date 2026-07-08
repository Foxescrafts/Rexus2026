const fs = require('fs');
const path = require('path');

function hasImmunity(peerId, userId) {
    const file = path.join(__dirname, '..', 'data', `gm_${peerId}.json`);
    try {
        if (fs.existsSync(file)) {
            const list = JSON.parse(fs.readFileSync(file, 'utf8'));
            return list.includes(userId);
        }
    } catch (e) {}
    return false;
}

module.exports = { hasImmunity };
