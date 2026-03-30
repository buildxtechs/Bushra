import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const settings = await db.findOne('settings', {});
        return NextResponse.json(settings || { 
            restaurantName: 'BUSHRA FAMILY RESTAURANT',
            billHeader: '496/2 Bangalore Main Road,\nSS Lodge Ground Floor,\nChengam - 606 709',
            phone: '8838993915, 7603947276\n9361060673',
            billFooter: 'THANK YOU!\nVisit Us Again 🙏',
            taxPercentage: 0
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        
        // Handle logo upload if it's a data URI
        if (data.logoUrl && data.logoUrl.startsWith('data:image')) {
            try {
                const { uploadImage } = await import("@/lib/cloudinary");
                const uploadResult = await uploadImage(data.logoUrl, 'branding');
                data.logoUrl = uploadResult.url;
            } catch (err) {
                console.error('Logo upload error:', err);
                // Continue without failing, maybe error message?
            }
        }

        const existing = await db.findOne('settings', {});
        
        if (existing) {
            await db.update('settings', { _id: existing._id }, data);
            const updated = await db.findById('settings', existing._id);
            return NextResponse.json(updated);
        } else {
            const newSettings = await db.insert('settings', data);
            return NextResponse.json(newSettings);
        }
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    return POST(req); // Settings is usually a single document
}

export const dynamic = 'force-dynamic';
