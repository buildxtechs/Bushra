'use client';
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';

export default function KitchenDisplay() {
    const [orders, setOrders] = useState([]);

    const fetchOrders = () => {
        fetch('/api/orders?kitchen=true')
            .then(r => r.json())
            .then(data => setOrders(data || []))
            .catch(() => { });
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (id, status) => {
        await fetch(`/api/orders/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        fetchOrders();
    };

    const placedOrders = orders.filter(o => o.status === 'placed');
    const preparingOrders = orders.filter(o => o.status === 'preparing');

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1>👨‍🍳 Kitchen Display</h1>
                    <p className="subtitle">Live order queue • Auto-refreshes every 5 seconds</p>
                </div>
                <button onClick={fetchOrders} className="btn btn-secondary">🔄 Refresh</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                {/* New Orders */}
                <div>
                    <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span style={{ background: 'var(--warning)', width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }}></span>
                        New Orders ({placedOrders.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {placedOrders.length === 0 && (
                            <div className="empty-state"><p style={{ color: 'var(--text-muted)' }}>No new orders</p></div>
                        )}
                        {placedOrders.map(order => (
                            <div key={order._id} className="card animate-bounceIn" style={{ borderLeft: '4px solid var(--warning)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                                    <span style={{ fontWeight: 800, fontSize: 'var(--font-md)' }}>{order.orderId}</span>
                                    <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                        {formatDateTime(order.createdAt)}
                                    </span>
                                </div>
                                <span className={`badge ${order.type === 'dine_in' ? 'badge-info' : order.type === 'delivery' ? 'badge-success' : 'badge-warning'}`}
                                    style={{ marginBottom: 'var(--space-sm)', textTransform: 'capitalize' }}>
                                    {order.type?.replace(/_/g, ' ')}
                                    {order.table ? ` • Table ${order.table.number}` : ''}
                                </span>
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    {order.items.map((item, i) => (
                                        <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{item.quantity}× </span>{item.name}
                                                {item.specialInstructions && (
                                                    <div style={{ fontSize: 'var(--font-xs)', color: 'var(--warning)', fontStyle: 'italic' }}>
                                                        📝 {item.specialInstructions}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {order.orderNotes && (
                                    <div style={{ background: 'var(--warning-bg)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-xs)', marginBottom: 'var(--space-sm)' }}>
                                        📝 {order.orderNotes}
                                    </div>
                                )}
                                <button onClick={() => updateStatus(order._id, 'preparing')} className="btn btn-primary" style={{ width: '100%' }}>
                                    🍳 Start Preparing
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preparing */}
                <div>
                    <h2 style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <span style={{ background: 'var(--info)', width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }}></span>
                        Preparing ({preparingOrders.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {preparingOrders.length === 0 && (
                            <div className="empty-state"><p style={{ color: 'var(--text-muted)' }}>Nothing cooking</p></div>
                        )}
                        {preparingOrders.map(order => (
                            <div key={order._id} className="card" style={{ borderLeft: '4px solid var(--info)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                                    <span style={{ fontWeight: 800 }}>{order.orderId}</span>
                                    <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{order.type?.replace(/_/g, ' ')}</span>
                                </div>
                                <div style={{ marginBottom: 'var(--space-md)' }}>
                                    {order.items.map((item, i) => (
                                        <div key={i} style={{ padding: '4px 0', fontSize: 'var(--font-sm)' }}>
                                            <span style={{ fontWeight: 600 }}>{item.quantity}× </span>{item.name}
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => updateStatus(order._id, 'ready')} className="btn btn-success" style={{ width: '100%' }}>
                                    ✅ Mark Ready
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
