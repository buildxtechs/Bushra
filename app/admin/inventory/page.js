'use client';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { formatDate } from '@/lib/utils';

export default function InventoryPage() {
    const [items, setItems] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const emptyItem = { name: '', quantity: '', unit: 'kg', minStockLevel: 10, costPerUnit: '', supplier: '' };
    const [form, setForm] = useState(emptyItem);
    const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', email: '', phone: '', address: '' });
    const [parcelPrices, setParcelPrices] = useState({ containerPrice: 0, gravyPrice: 0 });
    const [savingPrices, setSavingPrices] = useState(false);
    const [rawSettings, setRawSettings] = useState(null);

    const fetchData = async () => {
        const [inv, sups, sets] = await Promise.all([
            fetch('/api/inventory').then(r => r.json()),
            fetch('/api/suppliers').then(r => r.json()),
            fetch('/api/settings').then(r => r.json()),
        ]);
        setItems(inv || []); 
        setSuppliers(sups || []); 
        setRawSettings(sets);
        if (sets) setParcelPrices({ containerPrice: sets.containerPrice || 0, gravyPrice: sets.gravyPrice || 0 });
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = { ...form, quantity: parseFloat(form.quantity), costPerUnit: parseFloat(form.costPerUnit || 0) };
            const method = editing ? 'PUT' : 'POST';
            if (editing) data.id = editing._id;
            await fetch('/api/inventory', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            addToast(editing ? 'Updated' : 'Added', 'success');
            setShowModal(false); setEditing(null); setForm(emptyItem); fetchData();
        } catch { addToast('Error', 'error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete?')) return;
        await fetch('/api/inventory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        addToast('Deleted', 'success'); fetchData();
    };

    const handleWhatsAppOrder = (item) => {
        if (!item.supplier || !item.supplier.phone) {
            addToast("Supplier doesn't have a phone number", 'error');
            return;
        }

        // Calculate recommended order quantity (e.g., getting back to 2x minLevel)
        const orderQty = Math.max(item.minStockLevel * 2 - item.quantity, item.minStockLevel);

        const message = `Hello ${item.supplier.name},%0A%0AI would like to place an order for stock replenishment:%0A%0A*Item:* ${item.name}%0A*Current Stock:* ${item.quantity} ${item.unit}%0A*Requested Quantity:* ${orderQty} ${item.unit}%0A%0APlease confirm availability and delivery time.%0A%0AThank you!`;

        const phoneNumber = item.supplier.phone.replace(/[^0-9]/g, '');
        // Add country code if not present (assuming India +91 for this example, or let wa.me handle it if user inputs it)
        const formattedPhone = phoneNumber.length === 10 ? `91${phoneNumber}` : phoneNumber;

        window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    };


    const saveSupplier = async (e) => {
        e.preventDefault();
        await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supplierForm) });
        addToast('Supplier added', 'success'); setShowSupplierModal(false); setSupplierForm({ name: '', contact: '', email: '', phone: '', address: '' }); fetchData();
    };

    const saveParcelPrices = async () => {
        setSavingPrices(true);
        try {
            const dataToSave = rawSettings ? { ...rawSettings, ...parcelPrices } : parcelPrices;
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSave)
            });
            if (res.ok) {
                addToast('Parcel prices updated', 'success');
            } else {
                addToast('Failed to update prices', 'error');
            }
        } catch (error) {
            addToast('An error occurred', 'error');
        } finally {
            setSavingPrices(false);
        }
    };

    const lowStock = items.filter(i => i.quantity <= i.minStockLevel);
    if (loading) return <LoadingAnimation />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1>Inventory</h1>
                    <p className="subtitle">{items.length} items tracked • {lowStock.length} low stock alerts</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button onClick={() => setShowSupplierModal(true)} className="btn btn-secondary">+ Supplier</button>
                    <button onClick={() => { setEditing(null); setForm(emptyItem); setShowModal(true); }} className="btn btn-primary">+ Add Stock</button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-lg)', padding: 'var(--space-md)' }}>
                <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>🥡 Global Parcel Pricing</h3>
                <div className="grid grid-4" style={{ alignItems: 'flex-end', gap: 'var(--space-md)' }}>
                    <div className="input-group">
                        <label style={{ fontSize: 'var(--font-xs)' }}>Container Price (₹)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={parcelPrices.containerPrice} 
                            onChange={e => setParcelPrices({...parcelPrices, containerPrice: parseFloat(e.target.value) || 0})}
                        />
                    </div>
                    <div className="input-group">
                        <label style={{ fontSize: 'var(--font-xs)' }}>Gravy Cup Price (₹)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            value={parcelPrices.gravyPrice} 
                            onChange={e => setParcelPrices({...parcelPrices, gravyPrice: parseFloat(e.target.value) || 0})}
                        />
                    </div>
                    <div className="input-group">
                        <button 
                            className="btn btn-primary" 
                            onClick={saveParcelPrices}
                            disabled={savingPrices}
                            style={{ width: '100%' }}
                        >
                            {savingPrices ? 'Saving...' : 'Update Prices'}
                        </button>
                    </div>
                </div>
                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                    Note: These prices are shared with the Settings page and used in the POS cart for parcel orders.
                </p>
            </div>

            {lowStock.length > 0 && (
                <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 'var(--space-lg)', background: 'var(--danger-bg)' }}>
                    <h3 style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>⚠️ Low Stock Alerts</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        {lowStock.map(i => <span key={i._id} className="badge badge-danger">{i.name}: {i.quantity} {i.unit}</span>)}
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead><tr><th>Item</th><th>Quantity</th><th>Unit</th><th>Min Level</th><th>Cost/Unit</th><th>Supplier</th><th>Last Restocked</th><th>Actions</th></tr></thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item._id}>
                                <td style={{ fontWeight: 600 }}>{item.name}</td>
                                <td><span className={`badge ${item.quantity <= item.minStockLevel ? 'badge-danger' : 'badge-success'}`}>{item.quantity}</span></td>
                                <td>{item.unit}</td>
                                <td>{item.minStockLevel}</td>
                                <td>₹{item.costPerUnit || 0}</td>
                                <td>{item.supplier?.name || '-'}</td>
                                <td style={{ fontSize: 'var(--font-xs)' }}>{formatDate(item.lastRestocked)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                        <button onClick={() => handleWhatsAppOrder(item)} className="btn btn-ghost btn-sm" title="Order via WhatsApp" style={{ color: '#25D366' }}>💬</button>
                                        <button onClick={() => { setEditing(item); setForm({ ...item, supplier: item.supplier?._id || '' }); setShowModal(true); }} className="btn btn-ghost btn-sm" title="Edit">✏️</button>
                                        <button onClick={() => handleDelete(item._id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} title="Delete">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Stock' : 'Add Stock'}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div className="input-group"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="grid grid-2">
                        <div className="input-group"><label>Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required min="0" /></div>
                        <div className="input-group"><label>Unit</label>
                            <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                                {['kg', 'g', 'litre', 'ml', 'pieces', 'packets', 'boxes'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-2">
                        <div className="input-group"><label>Min Stock Level</label><input type="number" value={form.minStockLevel} onChange={e => setForm({ ...form, minStockLevel: e.target.value })} /></div>
                        <div className="input-group"><label>Cost/Unit (₹)</label><input type="number" value={form.costPerUnit} onChange={e => setForm({ ...form, costPerUnit: e.target.value })} min="0" step="0.01" /></div>
                    </div>
                    <div className="input-group"><label>Supplier</label>
                        <select value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
                            <option value="">None</option>
                            {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>{editing ? 'Update' : 'Add'}</button>
                </form>
            </Modal>

            <Modal isOpen={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Add Supplier" width="400px">
                <form onSubmit={saveSupplier} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div className="input-group"><label>Name</label><input value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} required /></div>
                    <div className="input-group"><label>Phone</label><input value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} /></div>
                    <div className="input-group"><label>Email</label><input type="email" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} /></div>
                    <div className="input-group"><label>Address</label><textarea value={supplierForm.address} onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })} rows={2} /></div>
                    <button type="submit" className="btn btn-primary">Save</button>
                </form>
            </Modal>
        </div>
    );
}
