const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function listCollections() {
    try {
        // Since we can't easily list collections without admin auth, 
        // we'll try to reach common ones.
        const collections = ['levels', 'units_new', 'challenges', 'steps'];
        for (const c of collections) {
            try {
                const list = await pb.collection(c).getList(1, 1);
                console.log(`Collection ${c}: Found ${list.totalItems} items`);
            } catch (err) {
                console.log(`Collection ${c}: ${err.message}`);
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

listCollections();
