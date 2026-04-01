const PocketBase = require('pocketbase/cjs');

async function checkSchema() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    
    try {
        const steps = await pb.collection('steps').getList(1, 1);
        console.log("Keys in step record:");
        if (steps.items.length > 0) {
            console.log(Object.keys(steps.items[0]));
        } else {
            console.log("No steps found");
        }
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkSchema();
