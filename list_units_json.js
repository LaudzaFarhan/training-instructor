const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function listUnits() {
    try {
        const units = await pb.collection('units_new').getFullList({ 
            sort: 'unitNumber' 
        });

        console.log(`Units found: ${units.length}`);
        const data = units.map(u => ({
            num: u.unitNumber,
            name: u.unitName,
            created: u.created,
            id: u.id
        }));
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listUnits();
