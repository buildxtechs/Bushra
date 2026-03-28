const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const CATEGORIES_FILE = path.join(__dirname, '../data/categories.json');
const ITEMS_FILE = path.join(__dirname, '../data/menuitems.json');

async function syncToMongo() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI not found in .env.local');
        return;
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('🚀 Connecting to MongoDB...');
        await client.connect();
        const db = client.db('restaurant_pos');
        
        const catMap = {}; // Map of slug -> ObjectId

        // 1. Sync Categories
        if (fs.existsSync(CATEGORIES_FILE)) {
            const categories = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
            const catCol = db.collection('categories');
            console.log(`📂 Syncing ${categories.length} categories...`);
            
            for (const cat of categories) {
                // If the _id is a slug (e.g., 'cat_salad'), we should generate a NEW ObjectId
                // but keep it consistent for future runs by checking if it already exists.
                let existing = await catCol.findOne({ slug: cat._id });
                let targetId = existing ? existing._id : new ObjectId();

                await catCol.updateOne(
                    { _id: targetId },
                    { 
                        $set: { 
                            name: cat.name, 
                            slug: cat._id, // Keep old slug as reference
                            order: cat.order, 
                            updatedAt: new Date() 
                        } 
                    },
                    { upsert: true }
                );
                catMap[cat._id] = targetId;
            }
            console.log('✅ Categories synced.');
        }

        // 2. Sync Menu Items
        if (fs.existsSync(ITEMS_FILE)) {
            const items = JSON.parse(fs.readFileSync(ITEMS_FILE, 'utf8'));
            const itemCol = db.collection('menuitems');
            console.log(`🍽️ Syncing ${items.length} menu items...`);
            
            let updated = 0;
            let created = 0;

            for (const item of items) {
                const catId = catMap[item.category];
                if (!catId) {
                    console.warn(`⚠️ skipping item ${item.name}: Category mapping not found for ${item.category}`);
                    continue;
                }

                const result = await itemCol.updateOne(
                    { name: item.name },
                    { 
                        $set: { 
                            code: item.code,
                            category: catId, // Use real ObjectId
                            price: item.price,
                            isVeg: item.isVeg,
                            updatedAt: new Date()
                        },
                        $setOnInsert: {
                            description: `${item.name} from BUSHRA`,
                            isAvailable: true,
                            isBestseller: false,
                            preparationTime: 15,
                            createdAt: new Date()
                        }
                    },
                    { upsert: true }
                );

                if (result.upsertedCount > 0) created++;
                else if (result.modifiedCount > 0) updated++;
            }
            console.log(`✅ Items synced: ${created} created, ${updated} updated.`);
        }

    } catch (error) {
        console.error('❌ Error syncing to MongoDB:', error);
    } finally {
        await client.close();
        process.exit(0);
    }
}

syncToMongo();
