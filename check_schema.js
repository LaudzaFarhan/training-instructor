const PocketBase = require('pocketbase/cjs');

async function checkSchema() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    // Login as admin
    await pb.admins.authWithPassword('admin@example.com', 'admin123456'); // Wait, I don't know the admin password.
    
    // Instead of logging in, I can just fetch a single step and see its keys if it's publicly readable
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
