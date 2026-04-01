const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function debugUnitValues() {
    try {
        const units = await pb.collection('units_new').getFullList();
        const levelUnits = units.filter(u => u.levelId === 'jarhs6knbud11x6');
        levelUnits.forEach(u => {
            console.log(`Name: ${u.unitName} | unitNumberValue: "${u.unitNumber}" | type: ${typeof u.unitNumber}`);
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugUnitValues();
