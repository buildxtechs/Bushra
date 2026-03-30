'use client';
import { useState, useEffect } from 'react';
import { SkeletonInput } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        billHeader: '',
        billFooter: '',
        taxPercentage: 0,
        gstin: '',
        phone: '',
        restaurantName: '',
        logoUrl: '',
        containerPrice: 0,
        gravyPrice: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                setSettings(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                addToast('Settings saved successfully', 'success');
            } else {
                addToast('Failed to save settings', 'error');
            }
        } catch (error) {
            addToast('An error occurred', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="subtitle">Configure system-wide restaurant settings</p>
                </div>
            </div>

            <div className="grid grid-2">
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>🍽️ Restaurant Info</h3>
                    <form onSubmit={handleSave} className="flex-col gap-md">
                        <div className="input-group">
                            <label>Logo Preview</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                {settings.logoUrl ? (
                                    <img src={settings.logoUrl} alt="Logo" style={{ height: 60, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
                                ) : (
                                    <div style={{ height: 60, width: 60, background: 'var(--bg-glass-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🥣</div>
                                )}
                                <input type="file" accept="image/*" onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.readAsDataURL(file);
                                        reader.onload = () => {
                                            setSettings({ ...settings, logoUrl: reader.result });
                                            addToast('Logo attached!', 'success');
                                        };
                                    }
                                }} style={{ flex: 1, fontSize: 'var(--font-xs)' }} />
                            </div>
                        </div>
                        {loading ? (
                            <>
                                <SkeletonInput />
                                <SkeletonInput />
                                <div className="grid grid-2">
                                    <SkeletonInput />
                                    <SkeletonInput />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="input-group">
                                    <label>Restaurant Name</label>
                                    <input 
                                        value={settings.restaurantName}
                                        onChange={e => setSettings({...settings, restaurantName: e.target.value})}
                                        placeholder="Enter restaurant name..."
                                    />
                                </div>
                                <div className="grid grid-2">
                                     <div className="input-group">
                                        <label>Phone Number</label>
                                        <input 
                                            value={settings.phone}
                                            onChange={e => setSettings({...settings, phone: e.target.value})}
                                            placeholder="+91..."
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>GSTIN</label>
                                        <input 
                                            value={settings.gstin}
                                            onChange={e => setSettings({...settings, gstin: e.target.value})}
                                            placeholder="27AA..."
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="mt-md">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Info'}
                            </button>
                        </div>
                    </form>

                    <h3 style={{ margin: 'var(--space-xl) 0 var(--space-md) 0' }}>📜 Bill Design</h3>
                    <form onSubmit={handleSave} className="flex-col gap-md">
                        {loading ? (
                            <>
                                <SkeletonInput />
                                <SkeletonInput />
                            </>
                        ) : (
                            <>
                                <div className="input-group">
                                    <label>Bill Header Text</label>
                                    <textarea 
                                        value={settings.billHeader}
                                        onChange={e => setSettings({...settings, billHeader: e.target.value})}
                                        placeholder="Enter address and additional contact info..."
                                        style={{ minHeight: 80 }}
                                    />
                                    <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>This appears at the top under the restaurant name.</p>
                                </div>
                                <div className="input-group">
                                    <label>Bill Footer Text</label>
                                    <textarea 
                                        value={settings.billFooter}
                                        onChange={e => setSettings({...settings, billFooter: e.target.value})}
                                        placeholder="Enter thank you message..."
                                        style={{ minHeight: 60 }}
                                    />
                                </div>
                            </>
                        )}
                        <div className="mt-md">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Save Bill Design'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>💸 Tax Configuration</h3>
                    <form onSubmit={handleSave} className="flex-col gap-md">
                        <div className="input-group">
                            <label>Global Sales Tax (%)</label>
                            <div className="flex items-center gap-sm">
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={settings.taxPercentage}
                                    onChange={e => setSettings({...settings, taxPercentage: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                    style={{ flex: 1 }}
                                />
                                <span style={{ fontWeight: 700 }}>%</span>
                            </div>
                            <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Applied to all orders unless item-specific tax is set.</p>
                        </div>
                        <div className="mt-md">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Update Tax Rate'}
                            </button>
                        </div>
                    </form>

                    <h3 style={{ margin: 'var(--space-xl) 0 var(--space-md) 0' }}>🥡 Parcel & Packaging Charges</h3>
                    <form onSubmit={handleSave} className="flex-col gap-md">
                        <div className="grid grid-2">
                            <div className="input-group">
                                <label>Container Price (₹)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={settings.containerPrice}
                                    onChange={e => setSettings({...settings, containerPrice: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="input-group">
                                <label>Gravy Cup Price (₹)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={settings.gravyPrice}
                                    onChange={e => setSettings({...settings, gravyPrice: parseFloat(e.target.value) || 0})}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>These prices will be available to add in the POS cart for parcel orders.</p>
                        <div className="mt-md">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : 'Update Parcel Prices'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-xl" style={{ 
                        background: 'rgba(255,255,255,0.01)', 
                        padding: 'var(--space-lg)', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)'
                    }}>
                        <h4 style={{ fontSize: 'var(--font-xs)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-md)', color: 'var(--text-muted)' }}>Receipt Preview</h4>
                        <div style={{ 
                            background: 'white', 
                            color: 'black', 
                            padding: 'var(--space-md)', 
                            fontFamily: 'monospace', 
                            fontSize: '11px',
                            textAlign: 'center',
                            whiteSpace: 'pre-wrap',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{settings.restaurantName || 'RESTAURANT NAME'}</div>
                            {settings.billHeader}
                            {settings.phone && <div>PH: {settings.phone}</div>}
                            {settings.gstin && <div>GST: {settings.gstin}</div>}
                            <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px dashed #ccc' }} />
                            <div style={{ textAlign: 'left' }}>
                                ITEM 1           ₹100.00<br/>
                                ITEM 2           ₹200.00<br/>
                                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #eee' }} />
                                SUB-TOTAL        ₹300.00<br/>
                                GST ({settings.taxPercentage}%)      ₹{(300 * settings.taxPercentage / 100).toFixed(2)}<br/>
                                <strong>TOTAL            ₹{(300 * (1 + settings.taxPercentage / 100)).toFixed(2)}</strong>
                            </div>
                            <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px dashed #ccc' }} />
                            {settings.billFooter}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
