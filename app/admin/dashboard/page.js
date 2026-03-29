'use client';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/components/Toast';

export default function AdminDashboard() {
    const [report, setReport] = useState(null);
    const [period, setPeriod] = useState('daily');
    const [loading, setLoading] = useState(true);
    const [cleaning, setCleaning] = useState(false);
    const { confirm } = useConfirm();
    const { addToast } = useToast();

    const fetchData = () => {
        setLoading(true);
        fetch(`/api/reports?period=${period}`)
            .then(r => r.json())
            .then(data => { setReport(data); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [period]);

    const handleCleanup = async () => {
        const isConfirmed = await confirm(
            '⚠️ Permanent Cleanup', 
            'Are you sure? This will permanently delete ALL sales, orders, and expenses data. This action cannot be undone.',
            { type: 'danger', confirmText: 'Clear Sales & Expenses' }
        );
        
        if (!isConfirmed) return;
        
        setCleaning(true);
        try {
            const res = await fetch('/api/admin/cleanup', { method: 'POST' });
            if (res.ok) {
                addToast('Sales and Expenses cleared successfully!', 'success');
                fetchData();
            } else {
                addToast('Failed to clear sales data.', 'error');
            }
        } catch (e) {
            addToast('An error occurred.', 'error');
        } finally {
            setCleaning(false);
        }
    };

    const downloadCSV = () => {
        if (!report?.orders?.length) {
            addToast('No data available to export', 'info');
            return;
        }
        const headers = 'Order ID,Customer,Items,Subtotal,Tax,Discount,Total,Status,Payment,Type,Date\n';
        const rows = report.orders.map(o =>
            `${o.orderId},${o.customerName || 'Walk-in'},"${o.items.map(i => i.name).join('; ')}",${o.subtotal},${o.tax},${o.discount},${o.total},${o.status},${o.paymentMethod},${o.type},${new Date(o.createdAt).toLocaleDateString()}`
        ).join('\n');
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `sales_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
        addToast('Exported CSV successfully', 'success');
    };

    if (loading && !report) return <LoadingAnimation />;

    const starItem = report?.topItems?.[0];

    return (
        <div className="animate-fadeIn">
            <div className="page-header" style={{ alignItems: 'flex-start' }}>
                <div>
                    <h1>Dashboard Overview</h1>
                    <p className="subtitle">Operational analytics & unified reporting for BUSHRA</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        {['daily', 'weekly', 'monthly', 'yearly'].map(p => (
                            <button key={p} className={`btn ${period === p ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                onClick={() => setPeriod(p)} style={{ textTransform: 'capitalize' }}>{p}</button>
                        ))}
                        <button onClick={downloadCSV} className="btn btn-success btn-sm">📥 Export CSV</button>
                    </div>
                    <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={handleCleanup}
                        disabled={cleaning}
                        style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', fontSize: '10px' }}
                    >
                        {cleaning ? '⌛ Cleaning...' : '🧹 Cleanup Sales & Expenses'}
                    </button>
                </div>
            </div>

            {/* Main Financial Stats */}
            <div className="grid grid-4" style={{ marginBottom: 'var(--space-lg)' }}>
                <div className="stat-card premium-hover">
                    <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.15)' }}>💰</div>
                    <div className="stat-info">
                        <h3>Gross Revenue</h3>
                        <div className="stat-value">{formatCurrency(report?.totalRevenue || 0)}</div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>From {report?.totalOrders || 0} orders</p>
                    </div>
                </div>
                <div className="stat-card premium-hover">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>💸</div>
                    <div className="stat-info">
                        <h3>Expenses</h3>
                        <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(report?.totalExpenses || 0)}</div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Operating costs</p>
                    </div>
                </div>
                <div className="stat-card premium-hover" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>💎</div>
                    <div className="stat-info">
                        <h3>Net Revenue</h3>
                        <div className="stat-value" style={{ color: 'var(--success)' }}>
                            {formatCurrency(report?.netRevenue || 0)}
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>After deductions</p>
                    </div>
                </div>
                <div className="stat-card premium-hover">
                    <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>📊</div>
                    <div className="stat-info">
                        <h3>Avg Order</h3>
                        <div className="stat-value" style={{ color: 'var(--info)' }}>
                            {formatCurrency(report?.avgOrderValue || 0)}
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Per customer sale</p>
                    </div>
                </div>
            </div>

            {/* Revenue Trend Chart Visualization */}
            {report?.revenueByDay && Object.keys(report.revenueByDay).length > 0 && (
                <div className="card card-glass animate-slideUp" style={{ marginBottom: 'var(--space-xl)' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>📈 Revenue Trends</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'thin' }}>
                        {Object.entries(report.revenueByDay).slice(-15).map(([day, rev]) => (
                            <div key={day} className="stat-card" style={{ 
                                textAlign: 'center', minWidth: 110, flex: '1 1 110px', 
                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)' 
                            }}>
                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{day}</div>
                                <div style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: 'var(--font-sm)' }}>{formatCurrency(rev)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
                {/* Fast Selling Product */}
                <div className="card card-glass" style={{ 
                    position: 'relative', overflow: 'hidden', 
                    border: '1px solid var(--accent-primary)',
                    background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.1), rgba(10, 14, 26, 0.8))'
                }}>
                    <div style={{ 
                        position: 'absolute', top: -10, right: -10, fontSize: 80, opacity: 0.1, transform: 'rotate(15deg)'
                    }}>🔥</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <span className="badge badge-warning" style={{ marginBottom: 'var(--space-sm)' }}>✨ Star of the Period</span>
                        <h3 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, marginBottom: 4 }}>
                            {starItem ? starItem.name : 'No Data'}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', marginBottom: 'var(--space-md)' }}>
                            Fastest selling product
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Orders</div>
                                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{starItem?.count || 0}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Revenue</div>
                                <div style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                    {formatCurrency(starItem?.revenue || 0)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Items Table */}
                <div className="card card-glass" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>🔥 Top Performing Menu Items</h3>
                    <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 8 }}>
                        {(report?.topItems || []).length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>No sales data available yet</p>
                        ) : (
                            report.topItems.slice(0, 8).map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 0', borderBottom: '1px solid var(--border-light)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <span style={{
                                            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                                            background: i === 0 ? 'var(--gradient-primary)' : 'var(--bg-card)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 'var(--font-xs)', fontWeight: 800, color: 'white',
                                        }}>{i + 1}</span>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{item.name}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{item.count} items sold</div>
                                        <div style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCurrency(item.revenue)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 'var(--space-xl)' }}>
                {/* Order Type Breakdown */}
                <div className="card card-glass">
                    <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>📊 Order Channels</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                        {Object.entries(report?.ordersByType || {}).map(([type, count]) => {
                            const total = report?.totalOrders || 1;
                            const pct = ((count / total) * 100).toFixed(0);
                            const colors = { dine_in: '#f97316', takeaway: '#fbbf24', delivery: '#10b981' };
                            return (
                                <div key={type}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--font-sm)' }}>
                                        <span style={{ textTransform: 'capitalize', fontWeight: 500 }}>{type.replace(/_/g, ' ')}</span>
                                        <span style={{ fontWeight: 700 }}>{count} ({pct}%)</span>
                                    </div>
                                    <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ 
                                            width: `${pct}%`, height: '100%', 
                                            background: colors[type] || 'var(--accent-primary)', 
                                            borderRadius: 'var(--radius-full)', 
                                            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' 
                                        }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Recent Activity Mini */}
                <div className="card card-glass">
                    <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-md)' }}>🕒 Recent Operations</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {(report?.orders || []).slice(0, 6).map(order => (
                            <div key={order._id} style={{ 
                                display: 'flex', justifyContent: 'space-between', padding: '10px 14px', 
                                background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(255,255,255,0.02)'
                            }}>
                                <div>
                                    <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>#{order.orderId}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleTimeString()} • {order.type?.replace(/_/g, ' ')}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 'var(--font-sm)', fontWeight: 800, color: 'var(--accent-primary)' }}>{formatCurrency(order.total)}</div>
                                    <span className={`badge ${order.status === 'delivered' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                                        {order.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
