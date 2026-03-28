import { NextResponse } from 'next/server';
import { db } from "@/lib/db";

export async function POST(req) {
    try {
        // Clear orders and expenses
        await Promise.all([
            db.delete('orders', {}),
            db.delete('expenses', {})
        ]);

        return NextResponse.json({ message: 'All sales and expense data cleared successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
