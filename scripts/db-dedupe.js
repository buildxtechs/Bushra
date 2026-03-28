const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function dedupe() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in .env.local');
        return;
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🚀 Connecting to MongoDB for deduplication...');
        await client.connect();
        const db = client.db('restaurant_pos');
        
        // 1. Deduplicate Categories
        console.log('📂 Deduplicating categories...');
        const catCol = db.collection('categories');
        const itemCol = db.collection('menuitems');
        
        const duplicateCats = await catCol.aggregate([
            { $group: { _id: '$name', ids: { $push: '$_id' }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        for (const record of duplicateCats) {
            const primaryId = record.ids[0];
            const duplicateIds = record.ids.slice(1);
            
            console.log(`  Merging ${record.count} categories for name: ${record._id}`);
            
            // Re-link menu items from duplicates to primary
            await itemCol.updateMany(
                { category: { $in: duplicateIds } },
                { $set: { category: primaryId } }
            );

            // Special case: check if string category slugs (like 'cat_salad') are being used in menuitems
            // but the category _id is an ObjectId.
            // I'll ensure any string category reference matches a slug in a category record.
            
            // Delete duplicates
            await catCol.deleteMany({ _id: { $in: duplicateIds } });
        }
        
        // 2. Clear out any cross-references to non-existent categories (cleanup)
        const finalCats = await catCol.find({}).toArray();
        const catIdSet = new Set(finalCats.map(c => c._id.toString()));
        const slugToIdMap = {};
        finalCats.forEach(c => { if (c.slug) slugToIdMap[c.slug] = c._id; });

        const items = await itemCol.find({}).toArray();
        for (const item of items) {
            const catRef = item.category;
            if (typeof catRef === 'string') {
                const targetId = slugToIdMap[catRef];
                if (targetId) {
                    await itemCol.updateOne({ _id: item._id }, { $set: { category: targetId } });
                }
            }
        }

        // 3. Deduplicate Menu Items
        console.log('🍽️ Deduplicating menu items...');
        const duplicateItems = await itemCol.aggregate([
            { $group: { _id: '$name', ids: { $push: '$_id' }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]).toArray();

        for (const record of duplicateItems) {
            const primaryId = record.ids[0]; // Keep oldest
            const duplicateIds = record.ids.slice(1);
            console.log(`  Merging ${record.count} items for name: ${record._id}`);
            await itemCol.deleteMany({ _id: { $in: duplicateIds } });
        }

        // 4. Final Counts
        const catCount = await catCol.countDocuments();
        const itemCount = await itemCol.countDocuments();
        
        console.log('\n--- Correct Totals ---');
        console.log(`✅ Categories: ${catCount}`);
        console.log(`✅ Products:   ${itemCount}`);
        console.log('----------------------');

    } catch (error) {
        console.error('❌ Error during deduplication:', error);
    } finally {
        await client.close();
        process.exit(0);
    }
}

dedupe();
