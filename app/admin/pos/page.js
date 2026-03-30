'use client';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/Modal';
import { db, cacheData, getCachedData } from '@/lib/offline-db';
import MenuItemCard from '@/components/pos/MenuItemCard';
import MenuSkeleton from '@/components/pos/MenuSkeleton';
import { useCallback, useMemo } from 'react';

export default function AdminPOS() {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingSync, setPendingSync] = useState(0);
    const [itemCode, setItemCode] = useState('');
    const { data: session } = useSession();
    const { addToast } = useToast();

    // Background Sync Logic
    useEffect(() => {
        const checkOnline = () => setIsOnline(navigator.onLine);
        const updatePendingCount = async () => {
            const count = await db.offlineOrders.where('synced').equals(0).count();
            setPendingSync(count);
        };

        const syncOfflineOrders = async () => {
            if (!navigator.onLine) return;
            const pending = await db.offlineOrders.where('synced').equals(0).toArray();
            if (pending.length === 0) return;

            addToast(`Syncing ${pending.length} orders in background...`, 'info');
            
            for (const order of pending) {
                try {
                    const { id, synced, ...orderData } = order;
                    const res = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderData)
                    });
                    if (res.ok) {
                        await db.offlineOrders.update(id, { synced: 1 });
                    }
                } catch (err) {
                    console.error('Sync failed for order:', order.id, err);
                    break;
                }
            }
            updatePendingCount();
        };

        window.addEventListener('online', () => { checkOnline(); syncOfflineOrders(); });
        window.addEventListener('offline', checkOnline);
        
        checkOnline();
        updatePendingCount();
        syncOfflineOrders();

        const interval = setInterval(() => {
            updatePendingCount();
            if (navigator.onLine) syncOfflineOrders();
        }, 15000); 

        return () => {
            window.removeEventListener('online', syncOfflineOrders);
            window.removeEventListener('offline', checkOnline);
            clearInterval(interval);
        };
    }, [addToast]);

    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tables, setTables] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState([]);
    const [orderType, setOrderType] = useState('dine_in');
    const [selectedTable, setSelectedTable] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState(0);
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState({ street: '', city: '', pincode: '' });
    const [notes, setNotes] = useState('');
    const [showPayment, setShowPayment] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Parcel Options State
    const [parcelOptions, setParcelOptions] = useState({
        isParcel: false,
        containerCount: 0,
        gravyCount: 0
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [cm, cc, ct, cs] = await Promise.all([
                    getCachedData('menuItems'), getCachedData('categories'),
                    getCachedData('tables'), getCachedData('settings')
                ]);
                
                if (cm?.length) {
                    setItems(cm); setCategories(cc); setTables(ct);
                    if (cs && cs.length) setSettings(cs[0]);
                    setLoading(false);
                }
            } catch (err) {
                console.warn('Initial cache load failed:', err);
            }

            try {
                const [m, c, t, s] = await Promise.all([
                    fetch('/api/menu').then(r => r.json()).catch(() => null),
                    fetch('/api/categories').then(r => r.json()).catch(() => null),
                    fetch('/api/tables').then(r => r.json()).catch(() => null),
                    fetch('/api/settings').then(r => r.json()).catch(() => null),
                ]);

                if (m) { setItems(m); cacheData('menuItems', m); }
                if (c) { setCategories(c); cacheData('categories', c); }
                if (t) { setTables(t); cacheData('tables', t); }
                if (s) {
                    const settingsData = Array.isArray(s) ? s[0] : s;
                    setSettings(settingsData);
                    cacheData('settings', s);
                }
            } catch (err) {
                console.error('Background sync error:', err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const findAndAddByCode = (val) => {
        if (val.length === 3) {
            const item = items.find(i => i.code === val);
            if (item) {
                addToCartPOS(item);
                setItemCode('');
                addToast(`Added ${item.name} to cart`, 'success');
                return true;
            } else {
                addToast('Item code not found', 'error');
                return false;
            }
        }
        return false;
    };

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const itemCatId = (item.category && typeof item.category === 'object') ? item.category._id : item.category;
            const matchCat = selectedCategory === 'all' || itemCatId === selectedCategory;
            const matchSearch = !search || 
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.code === search;
            return matchCat && matchSearch;
        });
    }, [items, selectedCategory, search]);

    const addToCartPOS = useCallback((item) => {
        setCart(prev => {
            const existing = prev.find(i => i._id === item._id);
            if (existing) return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...item, quantity: 1, specialInstructions: '' }];
        });
    }, []);

    const updateQty = useCallback((id, qty) => {
        if (qty <= 0) { setCart(prev => prev.filter(i => i._id !== id)); return; }
        setCart(prev => prev.map(i => i._id === id ? { ...i, quantity: qty } : i));
    }, []);

    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const containerCharge = parcelOptions.isParcel ? (parcelOptions.containerCount * (settings?.containerPrice || 0)) : 0;
    const gravyCharge = parcelOptions.isParcel ? (parcelOptions.gravyCount * (settings?.gravyPrice || 0)) : 0;
    const totalParcelCharges = containerCharge + gravyCharge;

    const taxRate = settings?.taxPercentage || 0;
    const tax = cart.reduce((s, i) => {
        const itemTaxRate = i.tax !== undefined ? i.tax : taxRate;
        return s + (i.price * i.quantity * itemTaxRate) / 100;
    }, 0);
    
    const total = subtotal + tax + totalParcelCharges - discount;

    const placeOrder = async (methodToUse) => {
        if (cart.length === 0) { addToast('Add items first', 'warning'); return; }
        
        const finalMethod = methodToUse || paymentMethod;
        
        const orderData = {
            customerName, customerPhone,
            deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
            items: cart.map(i => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, specialInstructions: i.specialInstructions })),
            subtotal, tax, discount, total,
            parcelCharges: parcelOptions.isParcel ? {
                container: parcelOptions.containerCount,
                containerPrice: settings?.containerPrice || 0,
                gravy: parcelOptions.gravyCount,
                gravyPrice: settings?.gravyPrice || 0,
                total: totalParcelCharges
            } : null,
            type: orderType, 
            paymentMethod: finalMethod,
            paymentStatus: 'paid',
            table: selectedTable || undefined,
            orderNotes: notes,
            createdBy: session?.user?.id,
        };

        try {
            if (!navigator.onLine) throw new Error('offline');

            const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
            const order = await res.json();
            
            if (!res.ok) throw new Error(order.error || 'Failed to place order');

            setLastOrder(order);
            setCart([]);
            setDiscount(0);
            setCustomerName('Walk-in Customer');
            setCustomerPhone('');
            setDeliveryAddress({ street: '', city: '', pincode: '' });
            setNotes('');
            setSelectedTable('');
            setParcelOptions({ isParcel: false, containerCount: 0, gravyCount: 0 });
            addToast('Order placed successfully!', 'success');

            const t = await fetch('/api/tables').then(r => r.json()).catch(() => getCachedData('tables'));
            setTables(t || []);
        } catch (err) { 
            if (err.message === 'offline' || !navigator.onLine || err.name === 'TypeError') {
                const offlineId = `OFF-${Date.now()}`;
                const offlineOrder = { ...orderData, orderId: offlineId, synced: 0, createdAt: new Date().toISOString() };
                await db.offlineOrders.add(offlineOrder);
                
                setLastOrder(offlineOrder);
                setCart([]);
                setDiscount(0);
                setCustomerName('Walk-in Customer');
                setCustomerPhone('');
                setDeliveryAddress({ street: '', city: '', pincode: '' });
                setNotes('');
                setSelectedTable('');
                setPendingSync(prev => prev + 1);
                addToast('Saved locally (Offline). Will sync automatically.', 'warning');
            } else {
                addToast(err.message, 'error'); 
            }
        }
    };

    const sendWhatsAppBill = () => {
        if (!lastOrder) return;
        const phone = customerPhone || lastOrder.customerPhone;
        if (!phone) { addToast('Please enter customer phone number', 'warning'); return; }

        const message = `*${settings?.restaurantName || 'BUSHRA FAMILY RESTAURANT'}*\n` +
            `---------------------------\n` +
            `*Order ID:* ${lastOrder.orderId}\n` +
            `*Date:* ${new Date(lastOrder.createdAt).toLocaleDateString()}\n` +
            `*Time:* ${new Date(lastOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n` +
            `---------------------------\n` +
            lastOrder.items.map(i => `• ${i.name} x ${i.quantity} = ₹${(i.price * i.quantity).toFixed(0)}`).join('\n') +
            `\n---------------------------\n` +
            `*Subtotal:* ₹${lastOrder.subtotal.toFixed(2)}\n` +
            (lastOrder.tax > 0 ? `*Tax:* ₹${lastOrder.tax.toFixed(2)}\n` : '') +
            (lastOrder.discount > 0 ? `*Discount:* -₹${lastOrder.discount.toFixed(2)}\n` : '') +
            `*TOTAL: ₹${lastOrder.total.toFixed(2)}*\n` +
            `---------------------------\n` +
            `${settings?.billFooter?.replace(/\\n/g, '\n') || 'Thank you! Visit again 🙏'}`;

        const cleanPhone = phone.replace(/\D/g, '');
        const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const printReceipt = () => {
        if (!lastOrder) return;
        const win = window.open('', '_blank');
        win.document.write(`
      <html><head><title>Receipt - ${lastOrder.orderId}</title>
      <style>
        @page { margin: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Outfit', sans-serif; width: 80mm; margin: 0; padding: 5mm; color: #000; font-size: 10.5pt; line-height: 1.4; }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .extra-bold { font-weight: 800; }
        .line { border-top: 2px solid #000; margin: 3mm 0; }
        .dashed-line { border-top: 1.2px dashed #444; margin: 2.5mm 0; }
        .header { font-size: 16pt; margin-bottom: 1mm; letter-spacing: -0.5px; }
        .info { font-size: 9.5pt; color: #000; font-weight: 600; line-height: 1.2; }
        .table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 3mm; color: #000; }
        .table th { border-bottom: 2px solid #000; padding: 2.5mm 0; text-align: left; font-weight: 800; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.5px; }
        .table td { padding: 2.5mm 0; vertical-align: top; font-weight: 600; }
        .total-row { display: flex; justify-content: space-between; font-size: 11pt; margin-top: 2mm; color: #000; font-weight: 700; }
        .qty { width: 15%; text-align: center !important; }
        .price { width: 22%; text-align: right !important; }
        .amt { width: 23%; text-align: right !important; }
        img { max-height: 75px; max-width: 180px; width: auto; margin-bottom: 4mm; filter: contrast(1.2) grayscale(1); object-fit: contain; }
      </style></head><body>
      <div class="center">
        ${settings?.logoUrl ? `<img src="${settings.logoUrl}">` : ''}
        <div class="header extra-bold">${settings?.restaurantName || 'BUSHRA FAMILY RESTAURANT'}</div>
        <div class="info">${settings?.billHeader || ''}</div>
        <div class="info">Ph: ${settings?.phone || ''}</div>
      </div>
      <div class="line"></div>
      <div style="display:flex; justify-content:space-between; font-size:9.5pt; margin-bottom: 1mm;" class="bold">
        <span>Date: ${new Date(lastOrder.createdAt).toLocaleDateString()}</span>
        <span>Time: ${new Date(lastOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div style="font-size:10.5pt;" class="extra-bold">Bill No: ${lastOrder.orderId}</div>
      <div class="dashed-line"></div>
      <table class="table">
        <thead><tr><th style="width:40%">Item</th><th class="qty">Qty</th><th class="price">Rate</th><th class="amt">Amt</th></tr></thead>
        <tbody>
          ${lastOrder.items.map((i) => `
            <tr><td style="width:40%">${i.name}</td><td class="qty">${i.quantity}</td><td class="price">${i.price.toFixed(0)}</td><td class="amt extra-bold">${(i.price * i.quantity).toFixed(0)}</td></tr>
          `).join('')}
        </tbody>
      </table>
      <div class="dashed-line"></div>
      <div class="total-row"><span>Subtotal Total</span><span>₹ ${lastOrder.subtotal.toFixed(2)}</span></div>
      ${lastOrder.tax > 0 ? `<div class="total-row"><span>GST</span><span>₹ ${lastOrder.tax.toFixed(2)}</span></div>` : ''}
      ${lastOrder.parcelCharges?.total > 0 ? `<div class="total-row"><span>Parcel Charges</span><span>₹ ${lastOrder.parcelCharges.total.toFixed(2)}</span></div>` : ''}
      ${lastOrder.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-₹ ${lastOrder.discount.toFixed(2)}</span></div>` : ''}
      <div class="line"></div>
      <div class="total-row extra-bold" style="font-size:14pt; padding-top:1mm"><span>TOTAL</span><span>₹ ${lastOrder.total.toFixed(0)}</span></div>
      <div class="line"></div>
      <div class="center bold" style="font-size:9.5pt; margin-top:2mm;">${settings?.billFooter?.replace(/\\n/g, '<br>') || 'THANK YOU! VISIT AGAIN 🙏'}</div>
      <script>window.onload = () => { setTimeout(() => { window.print(); window.onafterprint = () => window.close(); }, 500); };</script>
      </body></html>
    `);
        win.document.close();
    };

    if (loading) return <LoadingAnimation />;

    return (
        <div className="pos-layout">
            <style jsx>{`
                .pos-layout { display: grid; grid-template-columns: 1fr 380px; gap: var(--space-md); height: calc(100vh - 2 * var(--space-md)); overflow: hidden; }
                @media (max-width: 1400px) { .pos-layout { grid-template-columns: 1fr 320px; } }
                @media (max-width: 1100px) { .pos-layout { grid-template-columns: 1fr 300px; gap: var(--space-sm); } }
                @media (max-width: 640px) {
                    .pos-layout { grid-template-columns: 1fr; height: auto; overflow-y: auto; display: flex; flex-direction: column; }
                    .cart-column { position: sticky; bottom: 0; height: auto !important; max-height: 80vh; z-index: 100; box-shadow: 0 -10px 25px rgba(0,0,0,0.1); }
                }
                .tabs { display: flex; gap: var(--space-xs); overflow-x: auto; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); scrollbar-width: none; }
                .tabs::-webkit-scrollbar { display: none; }
                .tab { padding: 8px 16px; border-radius: var(--radius-sm); background: var(--bg-card); border: 1px solid var(--border); color: var(--text-secondary); font-size: var(--font-xs); font-weight: 600; white-space: nowrap; cursor: pointer; transition: 0.2s; }
                .tab.active { background: var(--gradient-primary); border-color: transparent; color: white; box-shadow: 0 4px 12px rgba(249,115,22,0.2); }
            `}</style>

            {/* Left: Menu */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 800, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>🍽️ BUSHRA POS</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'var(--space-xs)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444' }}></div>
                            <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: isOnline ? 'var(--text-secondary)' : '#ef4444' }}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                            {pendingSync > 0 && <span className="badge badge-warning" style={{ fontSize: '9px', padding: '2px 6px' }}>{pendingSync} PENDING</span>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <input type="text" placeholder="No. (001)" value={itemCode}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                setItemCode(val);
                                if (val.length === 3) findAndAddByCode(val);
                            }}
                            style={{ maxWidth: 80, padding: '8px 12px', fontSize: 'var(--font-xs)', border: '2px solid var(--accent-primary)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 800 }} />
                        <input type="search" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 150, padding: '8px 12px', fontSize: 'var(--font-xs)' }} />
                    </div>
                </div>

                <div className="tabs" style={{ marginBottom: 'var(--space-sm)' }}>
                    <button className={`tab ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>All</button>
                    {categories.map(c => <button key={c._id} className={`tab ${selectedCategory === c._id ? 'active' : ''}`} onClick={() => setSelectedCategory(c._id)}>{c.name}</button>)}
                </div>

                <div style={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 'var(--space-md)', alignContent: 'start', paddingBottom: '80px' }}>
                    {loading ? <MenuSkeleton /> : filteredItems.map(item => <MenuItemCard key={item._id} item={item} inCart={cart.find(i => i._id === item._id)} onAdd={addToCartPOS} />)}
                </div>
            </div>

            {/* Right: Cart */}
            <div className="cart-column" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
                <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        {['dine_in', 'takeaway', 'delivery'].map(t => <button key={t} className={`btn btn-sm ${orderType === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setOrderType(t)} style={{ flex: 1, fontSize: '10px' }}>{t.replace(/_/g, ' ')}</button>)}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '6px 10px', fontSize: 'var(--font-xs)' }} />
                        <input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '6px 10px', fontSize: 'var(--font-xs)' }} />
                        {orderType === 'dine_in' && (
                            <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} style={{ width: 100, padding: '6px', fontSize: 'var(--font-xs)' }}>
                                <option value="">Table</option>
                                {tables.filter(t => t.status === 'available').map(t => <option key={t._id} value={t._id}>T{t.number}</option>)}
                            </select>
                        )}
                    </div>
                    <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700 }}>🥡 Parcel?</span>
                            <div onClick={() => setParcelOptions(prev => ({ ...prev, isParcel: !prev.isParcel }))} style={{ width: 36, height: 20, borderRadius: 10, background: parcelOptions.isParcel ? 'var(--accent-primary)' : 'var(--border)', position: 'relative', cursor: 'pointer' }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: parcelOptions.isParcel ? 18 : 2, transition: '0.2s' }}></div>
                            </div>
                        </div>
                        {parcelOptions.isParcel && (
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 8 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '9px', fontWeight: 600 }}>Containers</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <button onClick={() => setParcelOptions(p => ({ ...p, containerCount: Math.max(0, p.containerCount - 1) }))}>-</button>
                                        <span style={{ fontSize: 11 }}>{parcelOptions.containerCount}</span>
                                        <button onClick={() => setParcelOptions(p => ({ ...p, containerCount: p.containerCount + 1 }))}>+</button>
                                    </div>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '9px', fontWeight: 600 }}>Gravy</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <button onClick={() => setParcelOptions(p => ({ ...p, gravyCount: Math.max(0, p.gravyCount - 1) }))}>-</button>
                                        <span style={{ fontSize: 11 }}>{parcelOptions.gravyCount}</span>
                                        <button onClick={() => setParcelOptions(p => ({ ...p, gravyCount: p.gravyCount + 1 }))}>+</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-sm)' }}>
                    {cart.length === 0 ? <p style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>Cart is empty</p> : cart.map(item => (
                        <div key={item._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 'var(--font-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>₹{item.price} per unit</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', minWidth: 28 }} onClick={() => updateQty(item._id, item.quantity - 1)}>-</button>
                                <span style={{ fontWeight: 800, fontSize: 'var(--font-sm)', minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                                <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', minWidth: 28 }} onClick={() => updateQty(item._id, item.quantity + 1)}>+</button>
                            </div>
                            <div style={{ fontWeight: 800, minWidth: 60, textAlign: 'right', fontSize: 'var(--font-sm)', color: 'var(--accent-primary)' }}>₹{(item.price * item.quantity).toFixed(0)}</div>
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-md)' }}>
                    <div style={{ fontSize: 'var(--font-sm)', marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal</span><span style={{ fontWeight: 600 }}>₹{subtotal.toFixed(2)}</span></div>
                        {tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Tax</span><span style={{ fontWeight: 600 }}>₹{tax.toFixed(2)}</span></div>}
                        {totalParcelCharges > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Parcel Charges</span><span style={{ fontWeight: 600 }}>₹{totalParcelCharges.toFixed(2)}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span>Discount</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>₹</span>
                                <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} style={{ width: 70, textAlign: 'right', padding: '4px 8px', fontSize: 'var(--font-xs)', border: '1px solid var(--border)', borderRadius: '4px' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 'var(--font-xl)', borderTop: '2px solid var(--border)', marginTop: 12, paddingTop: 12, color: 'var(--accent-primary)' }}>
                            <span>TOTAL</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCart([])}>Clear</button>
                        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setShowPayment(true)}>Pay ₹{total.toFixed(0)}</button>
                    </div>
                </div>
            </div>

            {/* Combined Checkout Modal */}
            <Modal isOpen={showPayment} onClose={() => { setShowPayment(false); setLastOrder(null); }} title={lastOrder ? "Order Success ✅" : "Checkout"} width="400px">
                {!lastOrder ? (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-primary)' }}>₹{total.toFixed(2)}</div>
                            <p>{cart.length} items in cart</p>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>SELECT PAYMENT METHOD</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {[
                                { id: 'cash', label: 'Cash', icon: '💵', color: '#22c55e' },
                                { id: 'card', label: 'Card', icon: '💳', color: '#3b82f6' },
                                { id: 'upi', label: 'UPI', icon: '📱', color: '#a855f7' }
                            ].map(m => (
                                <button key={m.id} 
                                    onClick={() => { setPaymentMethod(m.id); placeOrder(m.id); }} 
                                    className="payment-mode-btn"
                                    style={{ 
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                                        padding: '24px 12px', borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${m.color}20`, background: `${m.color}05`,
                                        cursor: 'pointer', transition: '0.3s',
                                        color: 'var(--text-primary)', fontWeight: 800, fontSize: 'var(--font-sm)'
                                    }}>
                                    <span style={{ fontSize: 32 }}>{m.icon}</span>
                                    {m.label.toUpperCase()}
                                    <style jsx>{`
                                        .payment-mode-btn:hover { background: ${m.color}15; border-color: ${m.color}; transform: translateY(-4px); box-shadow: 0 10px 20px -5px ${m.color}30; }
                                        .payment-mode-btn:active { transform: scale(0.95); }
                                    `}</style>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 40 }}>🎉</div>
                        <h3>Order #{lastOrder.orderId}</h3>
                        <div style={{ fontSize: 24, fontWeight: 800, margin: '15px 0' }}>₹{lastOrder.total.toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={printReceipt} className="btn btn-primary" style={{ flex: 1 }}>🖨️ Print Bill</button>
                            <button onClick={sendWhatsAppBill} className="btn btn-secondary" style={{ flex: 1 }}>💬 WhatsApp</button>
                        </div>
                        <button onClick={() => { setShowPayment(false); setLastOrder(null); }} className="btn btn-ghost" style={{ width: '100%', marginTop: 15 }}>🆕 New Order</button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
