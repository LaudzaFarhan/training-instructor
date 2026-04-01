const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function main() {
    try {
        const levels = await pb.collection('codingLevels').getFullList();
        const level = levels.find(l => l.name === 'Advance 1');
        if (!level) {
            console.log('Advance 1 not found');
            return;
        }
        console.log('Level ID:', level.id);

        const units = await pb.collection('units_new').getFullList({ 
            filter: `levelId="${level.id}"`, 
            sort: 'unitNumber' 
        });
        
        for (const u of units) {
            console.log(`Unit ${u.unitNumber}: ${u.unitName} (Created: ${u.created}, ID: ${u.id})`);
            const challenges = await pb.collection('challenges').getFullList({ 
                filter: `unitId="${u.id}"`, 
                sort: 'created' 
            });
            if (challenges.length > 0) {
                console.log('Challenge Keys:', Object.keys(challenges[0]));
            }
            for (const c of challenges) {
                console.log(`  Challenge: ${c.challengeName} (Order: ${c.order}, Created: ${c.created}, ID: ${c.id})`);
                const steps = await pb.collection('steps').getFullList({ 
                    filter: `challengeId="${c.id}"`, 
                    sort: 'stepIndex' 
                });
                const hardSteps = steps.filter(s => s.difficulty === 'hard');
                console.log(`    Hard Steps: ${hardSteps.length}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

main();
