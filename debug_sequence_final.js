const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function debugSequence() {
    try {
        const units = await pb.collection('units_new').getFullList();
        const varUnit = units.find(u => u.unitName.includes('Variable'));
        if (!varUnit) {
            console.log('Variable unit not found');
            return;
        }

        const levelId = varUnit.levelId;
        console.log(`Level ID for Variable: ${levelId}`);

        const levelUnits = units.filter(u => u.levelId === levelId);
        console.log(`Units found for level ${levelId}: ${levelUnits.length}`);

        // Numerical sort
        levelUnits.sort((a, b) => {
            const numA = parseInt(a.unitNumber) || 0;
            const numB = parseInt(b.unitNumber) || 0;
            if (numA !== numB) return numA - numB;
            return new Date(a.created) - new Date(b.created);
        });

        levelUnits.forEach((u, i) => {
            console.log(`${i}. [${u.unitNumber}] ${u.unitName} | Created: ${u.created}`);
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugSequence();
