const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function findSequence() {
    try {
        const units = await pb.collection('units_new').getFullList();
        const seqUnit = units.find(u => u.unitName.includes('Sequence'));
        if (seqUnit) {
            console.log(`Sequence & Buzzers levelId: ${seqUnit.levelId}, unitNumber: ${seqUnit.unitNumber}`);
        } else {
            console.log('Sequence & Buzzers not found');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

findSequence();
