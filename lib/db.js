import dbConnect from './mongodb';
import User from '@/models/User';
import Category from '@/models/Category';
import MenuItem from '@/models/MenuItem';
import Table from '@/models/Table';
import Order from '@/models/Order';
import Coupon from '@/models/Coupon';
import Supplier from '@/models/Supplier';
import Inventory from '@/models/Inventory';
import Review from '@/models/Review';
import Settings from '@/models/Settings';
import Expense from '@/models/Expense';

const models = {
    users: User,
    categories: Category,
    menuitems: MenuItem,
    tables: Table,
    orders: Order,
    coupons: Coupon,
    suppliers: Supplier,
    inventory: Inventory,
    reviews: Review,
    settings: Settings,
    expenses: Expense
};

export const db = {
    read: async (collection) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) return [];
        return await Model.find({}).lean();
    },

    find: async (collection, query = {}) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) return [];
        return await Model.find(query).lean();
    },

    findOne: async (collection, query = {}) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) return null;
        return await Model.findOne(query).lean();
    },

    findById: async (collection, id) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) return null;
        return await Model.findById(id).lean();
    },

    insert: async (collection, item) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) throw new Error(`Model ${collection} not found`);
        const newItem = new Model(item);
        await newItem.save();
        return newItem.toObject();
    },

    update: async (collection, query, update) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) return 0;
        const result = await Model.updateMany(query, { $set: update });
        return result.modifiedCount;
    },

    delete: async (collection, query) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) return 0;
        const result = await Model.deleteMany(query);
        return result.deletedCount;
    },

    aggregate: async (collection, pipeline) => {
        await dbConnect();
        const Model = models[collection];
        if (!Model) return [];
        return await Model.aggregate(pipeline);
    },

    // Legacy method for settings or single documents
    write: async (collection, data) => {
        // This is tricky for MongoDB. If it's a list, we might want to replace everything?
        // But usually 'write' in our old system was used for the whole collection.
        // For now, we'll just log it or handle specific cases if needed.
        console.warn(`db.write called for ${collection}. Migration might be needed for this call site.`);
    }
};
