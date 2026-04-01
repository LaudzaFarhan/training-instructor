const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function listLevels() {
    try {
        const levels = await pb.collection('levels').getFullList();
        levels.forEach(l => {
            console.log(`Level: ${l.levelName} | ID: ${l.id}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listLevels();
