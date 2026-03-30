const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function ensureIndexes() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected successfully.');

        const db = mongoose.connection.db;

        console.log('Creating indexes for MenuItems...');
        await db.collection('menuitems').createIndex({ category: 1 });
        await db.collection('menuitems').createIndex({ code: 1 }, { unique: true, sparse: true });
        await db.collection('menuitems').createIndex({ name: 1 });

        console.log('Creating indexes for Orders...');
        await db.collection('orders').createIndex({ status: 1 });
        await db.collection('orders').createIndex({ createdAt: -1 });
        await db.collection('orders').createIndex({ 'items.item': 1 });
        await db.collection('orders').createIndex({ 'items.menuItem': 1 });

        console.log('Creating indexes for Categories...');
        await db.collection('categories').createIndex({ name: 1 });

        console.log('All indexes ensured successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating indexes:', error);
        process.exit(1);
    }
}

ensureIndexes();
