'use client';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const fetchOrders = () => {
        fetch('/api/orders')
            .then(r => r.json())
            .then(data => {
                // Sort by newest first
                setOrders((data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (orderId, status) => {
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error('Failed to update');
            addToast(`Order marked as ${status.replace(/_/g, ' ')}`, 'success');
            fetchOrders();
        } catch (err) {
            addToast('Error updating status', 'error');
        }
    };

    if (loading) return <LoadingAnimation />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1>📋 All Orders Management</h1>
                    <p className="subtitle">View and update the status of every customer order.</p>
                </div>
                <button onClick={fetchOrders} className="btn btn-secondary">🔄 Refresh</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Order ID & Date</th>
                                <th>Customer Info</th>
                                <th>Items Ordered</th>
                                <th>Type & Payment</th>
                                <th>Total</th>
                                <th>Status Update</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order._id}>
                                    <td style={{ fontWeight: 600, fontSize: 'var(--font-xs)' }}>
                                        {order.orderId}
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>
                                            {formatDateTime(order.createdAt)}
                                        </div>
                                    </td>

                                    <td style={{ fontSize: 'var(--font-xs)' }}>
                                        <div style={{ fontWeight: 600 }}>{order.customerName || order.customer?.name || 'Walk-in'}</div>
                                        {(order.customerPhone || order.customer?.phone) && (
                                            <div>📞 {order.customerPhone || order.customer?.phone}</div>
                                        )}
                                        {order.type === 'delivery' && order.deliveryAddress && (
                                            <div style={{ color: 'var(--text-secondary)', marginTop: 4, maxWidth: 150 }}>
                                                📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}
                                            </div>
                                        )}
                                    </td>

                                    <td style={{ fontSize: 'var(--font-xs)' }}>
                                        {order.items.map((i, idx) => (
                                            <div key={idx} style={{ marginBottom: 4 }}>
                                                <span style={{ fontWeight: 500 }}>{i.quantity}x {i.name}</span> <span style={{ color: 'var(--text-muted)' }}>(₹{i.price})</span>
                                            </div>
                                        ))}
                                        {order.orderNotes && (
                                            <div style={{ color: 'var(--warning)', marginTop: 4, fontStyle: 'italic', maxWidth: 200, whiteSpace: 'normal' }}>
                                                📝 Note: {order.orderNotes}
                                            </div>
                                        )}
                                    </td>

                                    <td>
                                        <span className="badge badge-info" style={{ textTransform: 'capitalize', marginBottom: 4, display: 'inline-block' }}>
                                            {order.type?.replace(/_/g, ' ')}
                                        </span>
                                        <br />
                                        <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                                            {order.paymentStatus}
                                        </span>
                                    </td>

                                    <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                                        {formatCurrency(order.total)}
                                    </td>

                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <select
                                                value={order.status}
                                                onChange={(e) => updateStatus(order._id, e.target.value)}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '4px',
                                                    border: '1px solid var(--border)',
                                                    backgroundColor: 'var(--bg-card)',
                                                    fontSize: 'var(--font-xs)',
                                                    fontWeight: '600',
                                                    color: order.status === 'delivered' ? 'var(--success)' :
                                                        order.status === 'cancelled' ? 'var(--danger)' :
                                                            order.status === 'preparing' ? 'var(--info)' : 'var(--text-primary)'
                                                }}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="preparing">Preparing</option>
                                                <option value="ready">Ready (Pickup/Delivery)</option>
                                                <option value="out_for_delivery">Out for Delivery</option>
                                                <option value="delivered">Delivered / Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No orders found in the system.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
