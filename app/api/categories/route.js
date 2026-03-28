import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

export async function GET() {
    try {
        const categories = await db.read('categories');
        return NextResponse.json(categories);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { name, image, description } = await req.json();
        
        let finalImage = image;
        if (image && image.startsWith('data:image')) {
            const uploadResult = await uploadImage(image, 'categories');
            finalImage = uploadResult.url;
        }

        const newCategory = await db.insert('categories', { name, image: finalImage, description });
        return NextResponse.json(newCategory, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        const { id, name, description, image } = await req.json();
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        let finalImage = image;
        if (image && image.startsWith('data:image')) {
            const uploadResult = await uploadImage(image, 'categories');
            finalImage = uploadResult.url;
        }

        await db.update('categories', { _id: id }, { name, description, image: finalImage });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        // Check for items in category
        const itemsCount = await db.find('menuitems', { category: id });
        if (itemsCount.length > 0) {
            return NextResponse.json({ error: 'Cannot delete category that contains items. Please move or delete the items first.' }, { status: 400 });
        }

        await db.delete('categories', { _id: id });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
