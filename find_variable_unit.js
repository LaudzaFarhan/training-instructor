const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function listUnits() {
    try {
        const units = await pb.collection('units_new').getFullList({ 
            sort: 'unitNumber' 
        });

        console.log(`Units found: ${units.length}`);
        const variableUnit = units.find(u => u.unitName.toLowerCase().includes('variable'));
        if (variableUnit) {
            console.log('Variable Unit Found:');
            console.log(JSON.stringify(variableUnit, null, 2));
        } else {
            console.log('Variable Unit not found in the list.');
            // Let's print all names to see what's there
            console.log('All Unit Names:', units.map(u => `${u.unitNumber}: ${u.unitName}`));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listUnits();
