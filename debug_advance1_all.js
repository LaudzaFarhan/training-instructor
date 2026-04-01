const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function debugAllUnits() {
    try {
        const units = await pb.collection('units_new').getFullList({ 
            filter: 'levelId="jarhs6knbud1182"',
            sort: 'unitNumber,created' 
        });

        console.log(`Units found for jarhs6knbud1182: ${units.length}`);
        units.forEach((u, i) => {
            console.log(`${i}. [${u.unitNumber}] ${u.unitName} | Created: ${u.created}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugAllUnits();
