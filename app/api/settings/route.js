import Settings from "@/models/Settings";
import dbConnect from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await dbConnect();
        const settings = await Settings.findOne({}).lean();
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
        await dbConnect();
        const body = await req.json();
        const { _id, __v, createdAt, updatedAt, ...data } = body;
        
        let settings = await Settings.findOne({});
        
        if (settings) {
            Object.assign(settings, data);
            await settings.save();
        } else {
            settings = await Settings.create(data);
        }
        
        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req) {
    return POST(req); // Settings is usually a single document
}

export const dynamic = 'force-dynamic';
