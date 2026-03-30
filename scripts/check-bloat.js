const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkBloat() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in .env.local');
        return;
    }

    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        console.log('--- Checking for Base64 Bloat ---');
        const items = await db.collection('menuitems').find({}).toArray();
        let totalBase64Count = 0;
        let totalSize = 0;

        items.forEach(item => {
            if (item.image && item.image.startsWith('data:image')) {
                totalBase64Count++;
                totalSize += item.image.length;
            }
        });

        console.log(`Total Menu Items: ${items.length}`);
        console.log(`Items with Base64 Images: ${totalBase64Count}`);
        console.log(`Approximate Base64 Payload Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        
        console.log('\n--- Checking for Order Table Size ---');
        const orderCount = await db.collection('orders').countDocuments();
        console.log(`Total Orders: ${orderCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkBloat();
