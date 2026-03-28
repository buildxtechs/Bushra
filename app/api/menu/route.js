import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

export async function GET() {
    try {
        const menuItems = await db.read('menuitems');
        const categories = await db.read('categories');
        const orders = await db.read('orders');

        // Calculate sales count per menu item from successful orders
        const salesCount = {};
        orders.forEach(order => {
            if (['completed', 'paid', 'served', 'delivered'].includes(order.status) || order.paymentStatus === 'paid') {
                order.items.forEach(item => {
                    const itemId = String(item.item || item.menuItem);
                    salesCount[itemId] = (salesCount[itemId] || 0) + (item.quantity || 1);
                });
            }
        });

        // Manual population and adding salesCount
        const populatedMenu = menuItems.map(item => ({
            ...item,
            salesCount: salesCount[String(item._id)] || 0,
            category: categories.find(c => String(c._id) === String(item.category)) || item.category
        }));

        // Sort by salesCount (descending)
        populatedMenu.sort((a, b) => b.salesCount - a.salesCount);

        return NextResponse.json(populatedMenu);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();

        // Handle image upload if it's a data URI
        if (data.image && data.image.startsWith('data:image')) {
            try {
                const uploadResult = await uploadImage(data.image, 'menu-items');
                data.image = uploadResult.url;
            } catch (err) {
                console.error('Cloudinary helper error:', err);
                return NextResponse.json({ error: 'Image upload failed. Please check your Cloudinary configuration in .env.local' }, { status: 500 });
            }
        }

        const newItem = await db.insert('menuitems', data);
        return NextResponse.json(newItem, { status: 201 });
    } catch (error) {
        if (error.name === 'CastError') {
            return NextResponse.json({ error: `Invalid ${error.path}: ${error.value}. Please ensure the category exists.` }, { status: 400 });
        }
        if (error.code === 11000 || error.message?.includes('E11000')) {
            return NextResponse.json({ error: 'Item code already exists. Please use a unique number.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const data = await req.json();
        const { id, ...updateData } = data;

        if (!id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

        // Handle image upload if it's a data URI
        if (updateData.image && updateData.image.startsWith('data:image')) {
            try {
                const uploadResult = await uploadImage(updateData.image, 'menu-items');
                updateData.image = uploadResult.url;
            } catch (err) {
                console.error('Cloudinary helper error:', err);
                return NextResponse.json({ error: 'Image upload failed. Please check your Cloudinary configuration in .env.local' }, { status: 500 });
            }
        }

        await db.update('menuitems', { _id: id }, updateData);
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error.name === 'CastError') {
            return NextResponse.json({ error: `Invalid ${error.path}: ${error.value}. Please ensure the category exists.` }, { status: 400 });
        }
        if (error.code === 11000 || error.message?.includes('E11000')) {
            return NextResponse.json({ error: 'Item code already exists. Please use a unique number.' }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { id } = await req.json();

        if (!id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

        await db.delete('menuitems', { _id: id });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
