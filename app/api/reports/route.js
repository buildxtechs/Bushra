import { NextResponse } from 'next/server';
import { db } from "@/lib/db";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'monthly';

        let allOrders = (await db.read('orders')) || [];
        const menuItemsCount = ((await db.read('menuitems')) || []).length;
        const categoriesCount = ((await db.read('categories')) || []).length;
        const allExpenses = (await db.read('expenses')) || [];
        allOrders = allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const now = new Date();
        let startDate = new Date(0); // all time by default

        if (period === 'daily') {
            startDate = new Date(now.setHours(0, 0, 0, 0));
        } else if (period === 'weekly') {
            const tempDate = new Date();
            startDate = new Date(tempDate.setDate(tempDate.getDate() - 7));
        } else if (period === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'yearly') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        // Filter orders by date
        const periodOrders = allOrders.filter(o => new Date(o.createdAt || o.date) >= startDate);
        const periodExpenses = allExpenses.filter(e => new Date(e.date || e.createdAt) >= startDate);

        // Valid orders for revenue calculation (exclude cancelled)
        const validOrders = periodOrders.filter(o => o.status !== 'cancelled');

        const totalRevenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        const totalExpenses = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const netRevenue = totalRevenue - totalExpenses;
        const totalOrders = validOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        const paidOrders = validOrders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'completed').length;
        const pendingPayments = validOrders.filter(o => o.paymentStatus === 'pending').length;

        // Order breakdown by type (normalize type/orderType)
        const ordersByType = validOrders.reduce((acc, o) => {
            const type = o.orderType || o.type || 'unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // Revenue breakdown by payment method
        const paymentRevenue = validOrders.reduce((acc, o) => {
            const method = (o.paymentMethod || 'cash').toLowerCase();
            const total = Number(o.total) || 0;
            acc[method] = (acc[method] || 0) + total;
            return acc;
        }, { cash: 0, card: 0, upi: 0 });

        // Revenue by Day
        const revenueByDay = validOrders.reduce((acc, o) => {
            const dateStr = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            acc[dateStr] = (acc[dateStr] || 0) + (Number(o.total) || 0);
            return acc;
        }, {});

        // Top Items Calculation
        const itemStats = {};
        validOrders.forEach(order => {
            (order.items || []).forEach(item => {
                const name = item.name || 'Unknown Item';
                if (!itemStats[name]) {
                    itemStats[name] = { name: name, count: 0, revenue: 0 };
                }
                itemStats[name].count += (Number(item.quantity) || 1);
                itemStats[name].revenue += ((Number(item.price) || 0) * (Number(item.quantity) || 1));
            });
        });

        const topItems = Object.values(itemStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return NextResponse.json({
            totalRevenue,
            totalExpenses,
            netRevenue,
            totalOrders,
            avgOrderValue,
            paidOrders,
            pendingPayments,
            ordersByType,
            paymentRevenue,
            revenueByDay,
            topItems,
            menuItemsCount,
            categoriesCount,
            orders: periodOrders
        });
    } catch (error) {
        console.error('Reports API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
