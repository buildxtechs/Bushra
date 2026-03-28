const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

async function finalRepair() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in .env.local');
        return;
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🚀 Connecting to MongoDB for EXHAUSTIVE final repair...');
        await client.connect();
        const db = client.db('restaurant_pos');
        
        const catCol = db.collection('categories');
        const itemCol = db.collection('menuitems');

        // 1. Audit and Map categories
        console.log('📂 Auditing and Mapping categories...');
        const allCats = await catCol.find({}).toArray();
        
        const slugMap = {}; // Example: 'cat_biryani' -> ObjectId
        const nameMap = {}; // Example: 'Noodles' -> ObjectId
        const legacyIds = [];

        allCats.forEach(cat => {
            if (typeof cat._id !== 'string') {
                if (cat.slug) slugMap[cat.slug] = cat._id;
                if (cat.name) nameMap[cat.name.toLowerCase()] = cat._id;
            } else {
                legacyIds.push(cat._id);
            }
        });

        // 2. Map b_catXX and legacy cat_xxx to their actual category names
        const bCatFix = {
            'b_cat15': 'Rice',
            'b_cat16': 'Noodles',
            'b_cat17': 'Indian Breads',
            'b_cat18': 'Parotta',
            'b_cat19': 'Starters',
            'b_cat20': 'Arabian BBQ & Grill',
            'b_cat21': 'Tandoori Non-Veg',
            'b_cat22': 'Biriyani',
            'b_cat23': 'Bucket Biriyani',
            'b_cat24': 'Chinese Non-Veg Starters',
            'b_cat25': 'Others',
            // Legacy cat_xxx fixes
            'cat_mojito': 'Fresh Soda & Mojito',
            'cat_traditional': 'Bushra Traditional'
        };

        // Add b_cat mappings to the slugMap using the nameMap
        for (const [slug, name] of Object.entries(bCatFix)) {
            const targetId = nameMap[name.toLowerCase()];
            if (targetId) slugMap[slug] = targetId;
        }

        // 3. Repair items
        console.log('🍽️ Migrating items...');
        const allItems = await itemCol.find({}).toArray();
        let fixedCount = 0;

        for (const item of allItems) {
            let targetId = null;

            // If the category field is a string, we MUST repair it.
            if (typeof item.category === 'string') {
                targetId = slugMap[item.category];
                
                // Fallback: If not in slugMap, try to match by name heuristic?
                // But usually slugMap should handle cat_xxx and b_catXX now.
                
                if (targetId) {
                    await itemCol.updateOne({ _id: item._id }, { $set: { category: targetId } });
                    fixedCount++;
                } else {
                    console.warn(`  ⚠️ Unmapped category slug: ${item.category} for item: ${item.name}`);
                }
            }
        }
        console.log(`✅ Repaired ${fixedCount} items.`);

        // 4. Force Purge Strings From Categories
        if (legacyIds.length > 0) {
            console.log(`🗑️ Deleting ${legacyIds.length} legacy string-ID categories...`);
            await catCol.deleteMany({ _id: { $in: legacyIds } });
        }

        // 5. Final Report
        const stringCats = await catCol.countDocuments({ _id: { $type: 'string' } });
        const stringItems = await itemCol.countDocuments({ category: { $type: 'string' } });
        
        console.log('\n--- Final Integrity Report ---');
        console.log(`✅ Categories with string IDs: ${stringCats}`);
        console.log(`✅ Items with string Categories: ${stringItems}`);
        console.log('-------------------------------');

    } catch (error) {
        console.error('❌ Error during final repair:', error);
    } finally {
        await client.close();
        process.exit(0);
    }
}

finalRepair();
