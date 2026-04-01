const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function debugUnits() {
    try {
        const levels = await pb.collection('levels').getFullList();
        const level = levels.find(l => l.levelName === 'Advance 1');
        
        if (!level) {
            console.error('Level Advance 1 not found');
            console.log('Available levels:', levels.map(l => l.levelName));
            return;
        }

        console.log(`Level: ${level.levelName} (${level.id})`);

        const units = await pb.collection('units_new').getFullList({ 
            filter: `levelId="${level.id}"`,
            sort: 'unitNumber,created' 
        });

        console.log(`Found ${units.length} units.`);

        for (const u of units) {
            console.log(`Unit ID: ${u.id}, Number: ${u.unitNumber}, Name: ${u.unitName}, Created: ${u.created}`);
            const challenges = await pb.collection('challenges').getFullList({ 
                filter: `unitId="${u.id}"`, 
                sort: 'created' 
            });
            for (const c of challenges) {
                console.log(`  Challenge: ${c.challengeName}, Created: ${c.created}`);
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

debugUnits();
