const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');
const fs = require('fs');

async function debugSequence() {
    try {
        const units = await pb.collection('units_new').getFullList();
        const varUnit = units.find(u => u.unitName.includes('Variable'));
        if (!varUnit) {
            console.log('Variable unit not found');
            return;
        }

        const levelId = varUnit.levelId;
        const levelUnits = units.filter(u => u.levelId === levelId);

        levelUnits.sort((a, b) => {
            const numA = parseInt(a.unitNumber) || 0;
            const numB = parseInt(b.unitNumber) || 0;
            if (numA !== numB) return numA - numB;
            return new Date(a.created) - new Date(b.created);
        });

        const output = levelUnits.map((u, i) => `${i}. [${u.unitNumber}] ${u.unitName} | ID: ${u.id} | LevelID: ${u.levelId} | Created: ${u.created}`).join('\n');
        fs.writeFileSync('sequence_debug_output.txt', output);
        console.log(`Saved ${levelUnits.length} units to sequence_debug_output.txt`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugSequence();
