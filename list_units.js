const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function listUnits() {
    try {
        const units = await pb.collection('units_new').getFullList({ 
            sort: 'unitNumber' 
        });

        console.log(`Units found: ${units.length}`);
        for (const u of units) {
            console.log(`Unit Number: ${u.unitNumber}, Name: ${u.unitName}, LevelID: ${u.levelId}, ID: ${u.id}, Created: ${u.created}`);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listUnits();
