const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function listAllUnits() {
    try {
        const units = await pb.collection('units_new').getFullList({ 
            sort: 'unitNumber,created' 
        });

        console.log(`Units found: ${units.length}`);
        units.forEach(u => {
            console.log(`${u.unitNumber} | ${u.unitName} | ${u.levelId} | ${u.created}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listAllUnits();
