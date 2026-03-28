import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";

export async function PUT(req, { params }) {
    try {
        const { id } = params;
        const { name, image } = await req.json();
        
        let finalImage = image;
        if (image && image.startsWith('data:image')) {
            const uploadResult = await uploadImage(image, 'categories');
            finalImage = uploadResult.url;
        }

        const data = { name };
        if (finalImage) data.image = finalImage;

        await db.update('categories', { _id: id }, data);
        const updated = await db.findById('categories', id);
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        const { id } = params;
        await db.delete('categories', { _id: id });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
