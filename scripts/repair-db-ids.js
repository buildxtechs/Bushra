const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function repair() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in .env.local');
        return;
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🚀 Connecting to MongoDB for final ID repair...');
        await client.connect();
        const db = client.db('restaurant_pos');
        
        const catCol = db.collection('categories');
        const itemCol = db.collection('menuitems');

        // 1. Map Slugs to Valid ObjectIds
        console.log('📂 Auditing categories...');
        const allCats = await catCol.find({}).toArray();
        const slugToIdMap = {};
        const stringIdCats = [];

        // First pass: identify correct ObjectId categories with slugs
        allCats.forEach(cat => {
            if (typeof cat._id !== 'string') {
                if (cat.slug) slugToIdMap[cat.slug] = cat._id;
            } else {
                stringIdCats.push(cat._id);
            }
        });

        // 2. Repair MenuItems
        console.log('🍽️ Migrating 135+ items from string categories to ObjectIds...');
        const itemsToRepair = await itemCol.find({ category: { $type: 'string' } }).toArray();
        console.log(`  Found ${itemsToRepair.length} items to fix.`);

        let fixed = 0;
        for (const item of itemsToRepair) {
            const targetId = slugToIdMap[item.category];
            if (targetId) {
                await itemCol.updateOne({ _id: item._id }, { $set: { category: targetId } });
                fixed++;
            } else {
                console.warn(`  ⚠️ No ObjectId category found for slug: ${item.category} (Item: ${item.name})`);
            }
        }
        console.log(`✅ Fixed ${fixed} menu item references.`);

        // 3. Delete String IDs Categories
        if (stringIdCats.length > 0) {
            console.log(`🗑️ Deleting ${stringIdCats.length} legacy string-ID categories...`);
            await catCol.deleteMany({ _id: { $in: stringIdCats } });
            console.log('✅ Legacy categories purged.');
        }

        // 4. Final Verification
        const stringCatsCount = await catCol.countDocuments({ _id: { $type: 'string' } });
        const stringItemsCount = await itemCol.countDocuments({ category: { $type: 'string' } });

        console.log('\n--- Final Integrity Report ---');
        console.log(`✅ Categories with string IDs: ${stringCatsCount}`);
        console.log(`✅ Items with string Categories: ${stringItemsCount}`);
        console.log('-------------------------------');

    } catch (error) {
        console.error('❌ Error during database repair:', error);
    } finally {
        await client.close();
        process.exit(0);
    }
}

repair();
