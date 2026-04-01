const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function debugAdvance1() {
    try {
        const levels = await pb.collection('levels').getFullList();
        const level = levels.find(l => l.levelName === 'Advance 1');
        if (!level) {
            console.log('Advance 1 not found');
            return;
        }

        const units = await pb.collection('units_new').getFullList({ 
            filter: `levelId="${level.id}"`,
            sort: 'unitNumber,created' 
        });

        console.log(`Units for ${level.levelName}:`);
        units.forEach(u => {
            console.log(`${u.unitNumber} | ${u.unitName} | ${u.created} | ${u.id}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugAdvance1();
