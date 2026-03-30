import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import Counter from "@/models/Counter";

async function getNextSequenceValue(sequenceName) {
    try {
        const sequenceDocument = await Counter.findOneAndUpdate(
            { id: sequenceName },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        return sequenceDocument.seq;
    } catch (error) {
        console.error("Counter increment error:", error);
        throw error;
    }
}

export async function GET() {
    try {
        const orders = await db.read('orders');
        return NextResponse.json(orders);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        
        // Use sequential bill number
        const nextSeq = await getNextSequenceValue('orders');
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const orderId = `BNS-${yearSuffix}-${nextSeq.toString().padStart(4, '0')}`;

        // Normalize order type to match schema enum
        let orderType = data.orderType || data.type || 'dine-in';
        if (orderType === 'dine_in') orderType = 'dine-in';
        if (orderType === 'takeaway') orderType = 'take-away';

        // Normalize payment status
        let paymentStatus = data.paymentStatus || 'pending';
        if (paymentStatus === 'paid') paymentStatus = 'completed';

        // Normalize items for the Mongoose model
        const normalizedItems = (data.items || []).map(i => ({
            item: i.item || i.menuItem || i._id,
            name: i.name,
            quantity: Number(i.quantity) || 1,
            price: Number(i.price) || 0,
            total: Number(i.total) || (Number(i.price) * (Number(i.quantity) || 1)),
            specialInstructions: i.specialInstructions || ''
        }));

        const orderData = {
            ...data,
            items: normalizedItems,
            parcelCharges: data.parcelCharges || null,
            orderType,
            paymentStatus,
            orderId, // Sequential Bill Number
            customerName: data.customerName || 'Walk-in Customer',
            customerPhone: data.customerPhone || '',
            orderNotes: data.orderNotes || data.notes || '',
            status: data.status || 'pending',
            createdAt: new Date().toISOString()
        };

        const newOrder = await db.insert('orders', orderData);

        // Update table status if dine-in
        const tableId = data.tableId || data.table;
        if (orderType === 'dine-in' && tableId) {
            await db.update('tables', { _id: tableId }, { 
                status: 'occupied', 
                currentOrder: newOrder._id 
            });
        }

        // Award loyalty points for customers
        const customerId = data.customerId || data.customer;
        if (customerId) {
            const customer = await db.findById('users', customerId);
            if (customer) {
                const pointsToAdd = Math.floor(data.total / 100); 
                await db.update('users', { _id: customerId }, {
                    loyaltyPoints: (customer.loyaltyPoints || 0) + pointsToAdd
                });
            }
        }

        return NextResponse.json(newOrder, { status: 201 });
    } catch (error) {
        console.error('Order creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
