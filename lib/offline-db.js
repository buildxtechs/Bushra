import Dexie from 'dexie';

export const db = new Dexie('BushraOfflineDB');

// Define database schema
db.version(3).stores({
    menuItems: '_id, name, code, category, price',
    categories: '_id, name',
    tables: '_id, number, status',
    settings: 'id, restaurantName',
    users: 'email, name, role, passwordHash',
    offlineOrders: '++id, customerName, total, status, createdAt, synced'
});

// Helper to save data to local DB
export const cacheData = async (storeName, data) => {
    if (!data) return;
    const items = Array.isArray(data) ? data : [data];
    try {
        await db[storeName].bulkPut(items);
    } catch (err) {
        console.error(`Failed to cache ${storeName}:`, err);
    }
};

// Helper to get cached data
export const getCachedData = async (storeName) => {
    try {
        return await db[storeName].toArray();
    } catch (err) {
        console.error(`Failed to fetch ${storeName} from cache:`, err);
        return [];
    }
};
