const PocketBase = require('pocketbase/cjs');

async function patchSchema() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    
    try {
        await pb.collection('_superusers').authWithPassword('tempadmin@example.com', 'temppass12345');
        const collection = await pb.collections.getOne('steps');
        
        const existingSchema = collection.fields || collection.schema || [];
        const existingNames = existingSchema.map(f => f.name);
        
        const newFields = [
            { name: 'expectedOutput', type: 'text', required: false, options: { max: null, pattern: '' } },
            { name: 'hint', type: 'text', required: false, options: { max: null, pattern: '' } },
            { name: 'testCases', type: 'json', required: false, options: {} }
        ];
        
        let changed = false;
        for (const f of newFields) {
            if (!existingNames.includes(f.name)) {
                existingSchema.push({ system: false, id: Math.random().toString(36).substring(2, 10), ...f });
                changed = true;
            }
        }
        
        if (changed) {
            console.log("Patching schema...");
            const updated = await pb.collections.update('steps', { fields: existingSchema });
            console.log("Schema Patched Successfully!");
        } else {
            console.log("Fields already exist. No changes made.");
        }
        
        // Delete the temp admin
        const admin = await pb.collection('_superusers').getList(1, 1, { filter: 'email="tempadmin@example.com"' });
        if (admin.items.length > 0) {
            await pb.collection('_superusers').delete(admin.items[0].id);
            console.log("Temp admin deleted.");
        }
        
    } catch (err) {
        console.error("Error:", err.response || err.message);
    }
}

patchSchema();
