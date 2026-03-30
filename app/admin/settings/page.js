'use client';
import { useState, useEffect } from 'react';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useToast } from '@/components/Toast';
import { db } from '@/lib/offline-db';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        restaurantName: '',
        tagline: '',
        phone: '',
        address: '',
        billHeader: '',
        billFooter: '',
        logoUrl: '',
        taxPercentage: 5,
        currency: '₹'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data) setSettings({ ...settings, ...data });
            } catch (err) {
                addToast('Failed to load settings', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                addToast('Settings updated successfully', 'success');
                // Sync with local cache for POS
                const updated = await res.json();
                setSettings(updated);
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            setSettings({ ...settings, logoUrl: reader.result });
            addToast('Logo attached! Save to finalize.', 'info');
        };
    };

    if (loading) return <LoadingAnimation />;

    return (
        <div className="animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1>System Settings</h1>
                    <p className="subtitle">Manage restaurant branding and bill configuration</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-2" style={{ gap: 'var(--space-lg)' }}>
                {/* Branding Section */}
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🏢 Restaurant Branding
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label>Restaurant Name</label>
                            <input 
                                value={settings.restaurantName} 
                                onChange={e => setSettings({ ...settings, restaurantName: e.target.value })}
                                placeholder="e.g. BUSHRA FAMILY RESTAURANT"
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>Tagline / HALAL Info</label>
                            <input 
                                value={settings.tagline} 
                                onChange={e => setSettings({ ...settings, tagline: e.target.value })}
                                placeholder="e.g. ⭐ Halal Certified | Premium Dining ⭐"
                            />
                        </div>
                        <div className="input-group">
                            <label>Restaurant Logo</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                                {settings.logoUrl && (
                                    <div style={{ 
                                        width: 80, height: 80, 
                                        borderRadius: 'var(--radius-md)', 
                                        border: '1px solid var(--border)',
                                        background: `url(${settings.logoUrl}) center/contain no-repeat`,
                                        backgroundColor: '#fff'
                                    }}></div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} id="logo-upload" />
                                    <label htmlFor="logo-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                        {settings.logoUrl ? 'Change Logo' : 'Upload Logo'}
                                    </label>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>
                                        Recommended: PNG with transparent background
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Section */}
                <div className="card">
                    <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        📞 Contact Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label>Phone Numbers (comma separated)</label>
                            <input 
                                value={settings.phone} 
                                onChange={e => setSettings({ ...settings, phone: e.target.value })}
                                placeholder="8838993915, 9361066673"
                            />
                        </div>
                        <div className="input-group">
                            <label>Full Address</label>
                            <textarea 
                                value={settings.address} 
                                onChange={e => setSettings({ ...settings, address: e.target.value })}
                                placeholder="496/2 Bangalore Main Road, SS Lodge Ground Floor, Chengam - 606 709"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* Bill Configuration */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🧾 Receipt / Bill Configuration
                    </h3>
                    <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label>Receipt Header (Secondary)</label>
                            <textarea 
                                value={settings.billHeader} 
                                onChange={e => setSettings({ ...settings, billHeader: e.target.value })}
                                placeholder="Additional info to show under address..."
                                rows={3}
                            />
                        </div>
                        <div className="input-group">
                            <label>Receipt Footer</label>
                            <textarea 
                                value={settings.billFooter} 
                                onChange={e => setSettings({ ...settings, billFooter: e.target.value })}
                                placeholder="🎉 THANK YOU! VISIT AGAIN ❤️"
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                {/* System Section */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                    <div className="grid grid-3" style={{ gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label>Tax Percentage (%)</label>
                            <input 
                                type="number"
                                value={settings.taxPercentage} 
                                onChange={e => setSettings({ ...settings, taxPercentage: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="input-group">
                            <label>Currency Symbol</label>
                            <input 
                                value={settings.currency} 
                                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button type="submit" disabled={saving} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                {saving ? 'Saving...' : '💾 Save All Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
