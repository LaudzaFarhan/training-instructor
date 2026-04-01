const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function debugAdvance1() {
    try {
        const levelId = 'jarhs6knbud1182';
        const units = await pb.collection('units_new').getFullList({ 
            filter: `levelId="${levelId}"`,
            sort: 'unitNumber,created' 
        });

        console.log(`Units found: ${units.length}`);
        units.forEach((u, i) => {
            console.log(`${i}. [${u.unitNumber}] ${u.unitName} (Created: ${u.created})`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugAdvance1();
