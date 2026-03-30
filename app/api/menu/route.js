import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const minimal = searchParams.get('minimal') === 'true';
        const search = searchParams.get('search') || '';
        const categoryId = searchParams.get('category') || '';
        
        let salesCount = {};
        
        // Skip expensive aggregation for administrative lists unless requested
        if (!minimal) {
            const salesStats = await db.aggregate('orders', [
                {
                    $match: {
                        $or: [
                            { status: { $in: ['completed', 'paid', 'served', 'delivered'] } },
                            { paymentStatus: 'paid' }
                        ]
                    }
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: { $ifNull: ['$items.item', '$items.menuItem'] },
                        totalSales: { $sum: '$items.quantity' }
                    }
                }
            ]);

            salesStats.forEach(stat => {
                if (stat._id) salesCount[String(stat._id)] = stat.totalSales;
            });
        }

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }
        if (categoryId) query.category = categoryId;

        const menuItems = await db.find('menuitems', query);
        const categories = await db.read('categories');

        // Manual population and adding salesCount
        const populatedMenu = menuItems.map(item => ({
            ...item,
            // Only include salesCount if not in minimal mode
            salesCount: !minimal ? (salesCount[String(item._id)] || 0) : undefined,
            category: categories.find(c => String(c._id) === String(item.category)) || item.category,
            // Optimization: If minimal, we could omit the full image here if it's too big
            // image: minimal ? undefined : item.image 
        }));

        // Sort by salesCount if available, otherwise by name
        if (!minimal) {
            populatedMenu.sort((a, b) => b.salesCount - a.salesCount);
        } else {
            populatedMenu.sort((a, b) => a.name.localeCompare(b.name));
        }

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
