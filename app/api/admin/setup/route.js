import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Concurrently fetch all essential dashboard data in a single round-trip
        const [categories, menuItems, settings] = await Promise.all([
            db.read('categories'),
            db.read('menuitems'),
            db.read('settings') // db.read('settings') will return the first document or default
        ]);

        // Optimized mapping for the menu items
        const categoryMap = categories.reduce((acc, cat) => {
            acc[String(cat._id)] = cat;
            return acc;
        }, {});

        const populatedMenu = menuItems.map(item => ({
            ...item,
            category: categoryMap[String(item.category)] || item.category
        })).sort((a, b) => (a.code || '').localeCompare(b.code || '') || a.name.localeCompare(b.name));

        const responseData = {
            categories: categories || [],
            menu: populatedMenu || [],
            settings: Array.isArray(settings) ? settings[0] : (settings || {})
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Setup API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
