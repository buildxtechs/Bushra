'use client';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function MenuManagement() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showCatModal, setShowCatModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(null);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    const emptyItem = { name: '', code: '', category: '', price: '', tax: 5, description: '', image: '', isAvailable: true, isVeg: true, isBestseller: false, ingredients: '' };
    const [form, setForm] = useState(emptyItem);
    const [catForm, setCatForm] = useState({ name: '', description: '' });

    const fetchData = async () => {
        const [cats, menuItems, settingsRes] = await Promise.all([
            fetch('/api/categories').then(r => r.json()),
            fetch('/api/menu?all=true').then(r => r.json()),
            fetch('/api/settings').then(r => r.json()),
        ]);
        setCategories(cats || []);
        setItems(menuItems || []);
        setSettings(settingsRes || {});
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Sanitize data to remove immutable internal MongoDB fields
            const { _id, createdAt, updatedAt, __v, ...itemData } = form;
            
            const data = {
                ...itemData,
                price: parseFloat(form.price),
                tax: parseFloat(form.tax),
                ingredients: typeof form.ingredients === 'string' 
                    ? form.ingredients.split(',').map(s => s.trim()).filter(Boolean) 
                    : form.ingredients
            };

            const method = editing ? 'PUT' : 'POST';
            if (editing) data.id = editing._id;

            const res = await fetch('/api/menu', { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(data) 
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to save item');

            addToast(editing ? 'Item updated successfully' : 'Item added successfully', 'success');
            setShowModal(false);
            setEditing(null);
            setForm(emptyItem);
            fetchData();
        } catch (err) { 
            addToast(err.message, 'error'); 
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm(
            'Delete Item?', 
            'Are you sure you want to delete this menu item? This cannot be undone.', 
            { type: 'danger', confirmText: 'Delete' }
        );
        if (!isConfirmed) return;
        
        await fetch('/api/menu', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        addToast('Item deleted', 'success');
        fetchData();
    };

    const toggleAvailability = async (item) => {
        await fetch('/api/menu', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item._id, isAvailable: !item.isAvailable })
        });
        fetchData();
    };

    const saveCategory = async (e) => {
        e.preventDefault();
        try {
            const method = catForm._id ? 'PUT' : 'POST';
            const body = catForm._id ? { id: catForm._id, ...catForm } : catForm;
            const res = await fetch('/api/categories', { 
                method, 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(body) 
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save category');
            }

            addToast(catForm._id ? 'Category updated' : 'Category added', 'success');
            setShowCatModal(false);
            setCatForm({ name: '', description: '' });
            fetchData();
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleDeleteCategory = async () => {
        if (!catForm._id) return;
        const confirmed = await confirm(`Are you sure you want to delete "${catForm.name}"?`);
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/categories?id=${catForm._id}`, { method: 'DELETE' });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete category');
            }
            addToast('Category deleted successfully', 'success');
            setShowCatModal(false);
            setCatForm({ name: '', description: '' });
            fetchData();
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setForm({ ...form, image: reader.result }); // Set base64 string
            addToast('Image attached!', 'success');
        };
        reader.onerror = (error) => {
            addToast('Failed to read image', 'error');
        };
    };

    if (loading) return <LoadingAnimation />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1>Menu Management</h1>
                    <p className="subtitle">{items.length} items across {categories.length} categories</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button onClick={() => setShowCatModal(true)} className="btn btn-secondary">+ Category</button>
                    <button onClick={() => { setEditing(null); setForm(emptyItem); setShowModal(true); }} className="btn btn-primary">
                        + Add Item
                    </button>
                </div>
            </div>

            {/* Categories */}
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
                {categories.map(cat => (
                    <div key={cat._id} className="badge badge-info" style={{ padding: '6px 12px', cursor: 'pointer', fontSize: 'var(--font-sm)' }}
                        onClick={() => { setCatForm({ _id: cat._id, name: cat.name, description: cat.description }); setShowCatModal(true); }}>
                        {cat.name}
                    </div>
                ))}
            </div>

            {/* Items Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>Item</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Tax</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item._id}>
                                    <td><span className="badge badge-secondary" style={{ fontWeight: 800 }}>{item.code || '-'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                            {item.image && <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: `url(${item.image}) center/cover`, flexShrink: 0 }}></div>}
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                {item.isBestseller && <span className="badge badge-warning" style={{ fontSize: '9px' }}>Bestseller</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="badge badge-info">{item.category?.name || '-'}</span></td>
                                    <td style={{ fontWeight: 700 }}>₹{item.price}</td>
                                    <td>{item.tax}%</td>
                                    <td><span className={`veg-badge ${item.isVeg ? 'veg' : 'non-veg'}`}></span></td>
                                    <td>
                                        <button onClick={() => toggleAvailability(item)}
                                            className={`badge ${item.isAvailable ? 'badge-success' : 'badge-danger'}`}
                                            style={{ cursor: 'pointer', border: 'none' }}>
                                            {item.isAvailable ? 'Available' : 'Unavailable'}
                                        </button>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                                            <button onClick={() => {
                                                setEditing(item);
                                                setForm({ ...item, category: item.category?._id || '', ingredients: (item.ingredients || []).join(', ') });
                                                setShowModal(true);
                                            }} className="btn btn-ghost btn-sm">✏️</button>
                                            <button onClick={() => handleDelete(item._id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Item Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Item' : 'Add Item'} width="600px">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div className="grid grid-3">
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Item Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mutton Biryani" required />
                        </div>
                        <div style={{ width: 100 }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Code (3-digit)</label>
                            <input value={form.code || ''} onChange={e => setForm({ ...form, code: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="001" maxLength={3} title="Unique 3-digit code for POS search" />
                        </div>
                        <div className="input-group">
                            <label>Category</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                                <option value="">Select</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-2">
                        <div className="input-group">
                            <label>Price (₹)</label>
                            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required min="0" step="0.01" />
                        </div>
                        <div className="input-group">
                            <label>Tax (%)</label>
                            <input type="number" value={form.tax} onChange={e => setForm({ ...form, tax: e.target.value })} min="0" />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Description</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
                    </div>
                    <div className="input-group">
                        <label>Ingredients (comma-separated)</label>
                        <input value={form.ingredients} onChange={e => setForm({ ...form, ingredients: e.target.value })} placeholder="Rice, Chicken, Spices" />
                    </div>
                    <div className="input-group">
                        <label>Food Image</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload}
                            style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--radius-sm)' }} />
                        {form.image && <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-sm)', background: `url(${form.image}) center/cover`, marginTop: 8 }}></div>}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-sm)' }}>
                            <input type="checkbox" checked={form.isVeg} onChange={e => setForm({ ...form, isVeg: e.target.checked })} /> Vegetarian
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-sm)' }}>
                            <input type="checkbox" checked={form.isBestseller} onChange={e => setForm({ ...form, isBestseller: e.target.checked })} /> Bestseller
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--font-sm)' }}>
                            <input type="checkbox" checked={form.isAvailable} onChange={e => setForm({ ...form, isAvailable: e.target.checked })} /> Available
                        </label>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }} disabled={saving}>
                        {saving ? 'Saving...' : (editing ? 'Update Item' : 'Add Item')}
                    </button>
                </form>
            </Modal>

            {/* Category Modal */}
            <Modal isOpen={showCatModal} onClose={() => setShowCatModal(false)} title={catForm._id ? 'Edit Category' : 'Add Category'} width="400px">
                <form onSubmit={saveCategory} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div className="input-group">
                        <label>Name</label>
                        <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
                    </div>
                    <div className="input-group">
                        <label>Description</label>
                        <textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} rows={2} />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                            {catForm._id ? 'Update Category' : 'Save Category'}
                        </button>
                        {catForm._id && (
                            <button type="button" onClick={handleDeleteCategory} className="btn btn-ghost" style={{ color: 'var(--danger)' }}>
                                🗑️ Delete
                            </button>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
}
