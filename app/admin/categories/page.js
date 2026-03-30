'use client';
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useAdmin } from '@/lib/contexts/AdminContext';
import { SkeletonCard, Shimmer } from '@/components/Skeleton';

export default function CategoriesManagement() {
    const { categories, loading, refreshData } = useAdmin();
    
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const { addToast } = useToast();
    const { confirm } = useConfirm();

    const emptyCat = { name: '', image: '', description: '' };
    const [form, setForm] = useState(emptyCat);

    const fetchData = () => refreshData(true);
    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const method = editing ? 'PUT' : 'POST';
            const url = editing ? `/api/categories/${editing._id}` : '/api/categories';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error('Failed to save category');

            addToast(editing ? 'Category updated' : 'Category added', 'success');
            setShowModal(false);
            setEditing(null);
            setForm(emptyCat);
            fetchCategories();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        const isConfirmed = await confirm(
            'Delete Category?',
            'Are you sure? This might affect items assigned to this category.',
            { type: 'danger', confirmText: 'Delete' }
        );
        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            addToast('Category deleted', 'success');
            fetchCategories();
        } catch (err) {
            addToast(err.message, 'error');
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setForm({ ...form, image: reader.result });
            addToast('Image uploaded!', 'success');
        };
    };

    if (loading && categories.length === 0) {
        return (
            <div className="animate-fadeIn">
                <Shimmer />
                <div className="page-header">
                    <div style={{ width: '300px' }}><SkeletonCard height="40px" /></div>
                    <div style={{ width: '100px' }}><SkeletonCard height="40px" /></div>
                </div>
                <div className="grid grid-4" style={{ gap: '20px' }}>
                    <SkeletonCard height="180px" />
                    <SkeletonCard height="180px" />
                    <SkeletonCard height="180px" />
                    <SkeletonCard height="180px" />
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1>Categories Management</h1>
                    <p className="subtitle">Manage menu categories and their visual representation</p>
                </div>
                <button onClick={() => { setEditing(null); setForm(emptyCat); setShowModal(true); }} className="btn btn-primary">
                    + Add Category
                </button>
            </div>

            <div className="grid grid-4" style={{ gap: 'var(--space-md)' }}>
                {categories.map(cat => (
                    <div key={cat._id} className="card category-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                            height: 140,
                            background: cat.image ? `url(${cat.image}) center/cover` : 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {!cat.image && <span style={{ fontSize: 40 }}>📂</span>}
                        </div>
                        <div style={{ padding: 'var(--space-md)' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-md)' }}>{cat.name}</h3>
                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 4, height: 32, overflow: 'hidden' }}>
                                {cat.description || 'No description provided'}
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
                                <button onClick={() => {
                                    setEditing(cat);
                                    setForm({ name: cat.name, image: cat.image, description: cat.description || '' });
                                    setShowModal(true);
                                }} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Edit</button>
                                <button onClick={() => handleDelete(cat._id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {categories.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-3xl)', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
                    <p>No categories found. Add your first category to get started.</p>
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'Add Category'} width="450px">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div className="input-group">
                        <label>Category Name</label>
                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Main Course, Desserts" />
                    </div>
                    <div className="input-group">
                        <label>Description (Optional)</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief description..." />
                    </div>
                    <div className="input-group">
                        <label>Category Image</label>
                        <div style={{
                            width: '100%',
                            height: 120,
                            borderRadius: 'var(--radius-md)',
                            border: '2px dashed var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: 'pointer',
                            background: form.image ? `url(${form.image}) center/cover` : 'var(--bg-glass-light)'
                        }} onClick={() => document.getElementById('cat-img-input').click()}>
                            {!form.image && (
                                <>
                                    <span style={{ fontSize: 24 }}>🖼️</span>
                                    <span style={{ fontSize: 10, marginTop: 4 }}>Click to upload</span>
                                </>
                            )}
                            <input id="cat-img-input" type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>
                        {editing ? 'Update Category' : 'Create Category'}
                    </button>
                </form>
            </Modal>

            <style jsx>{`
                .category-card {
                    transition: transform 0.2s;
                    border: 1px solid var(--border-light);
                }
                .category-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--accent-primary);
                }
                .grid-4 {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                }
            `}</style>
        </div>
    );
}
