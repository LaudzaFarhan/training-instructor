const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function listUnits() {
    try {
        const units = await pb.collection('units_new').getFullList({ 
            sort: 'unitNumber' 
        });

        console.log(`Units found: ${units.length}`);
        units.forEach(u => {
            console.log(`Unit: ${u.unitName} | Number: ${u.unitNumber} | LevelID: ${u.levelId}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listUnits();
