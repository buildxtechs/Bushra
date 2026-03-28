const { MongoClient } = require('mongodb');
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
        
        // 1. Sync Categories
        if (fs.existsSync(CATEGORIES_FILE)) {
            const categories = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));
            const catCol = db.collection('categories');
            console.log(`📂 Syncing ${categories.length} categories...`);
            
            for (const cat of categories) {
                await catCol.updateOne(
                    { _id: cat._id },
                    { $set: { name: cat.name, order: cat.order, updatedAt: new Date() } },
                    { upsert: true }
                );
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
                const result = await itemCol.updateOne(
                    { name: item.name },
                    { 
                        $set: { 
                            code: item.code,
                            category: item.category,
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
