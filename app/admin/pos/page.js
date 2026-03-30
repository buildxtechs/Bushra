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
            
            // Optimized: Use Promise.all with small batches if needed, or sequential for stability
            // For now, staying sequential but faster UI feedback
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
    }, []);
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
    const [modalState, setModalState] = useState('none'); // 'none', 'payment', 'success'
    const [lastOrder, setLastOrder] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    // Parcel Options State
    const [parcelEnabled, setParcelEnabled] = useState(false);
    const [parcelOptions, setParcelOptions] = useState({ gravy: 0, container: 0 });
    const PARCEL_CHARGES = { container: 10, gravy: 5 };

    const [printCountdown, setPrintCountdown] = useState(0);

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
    const { data: session } = useSession();
    const { addToast } = useToast();

    useEffect(() => {
        const loadInitialData = async () => {
            // Instant Load Phase: Load from IndexedDB immediately
            try {
                const [cm, cc, ct, cs] = await Promise.all([
                    getCachedData('menuItems'), getCachedData('categories'),
                    getCachedData('tables'), getCachedData('settings')
                ]);
                
                if (cm.length) {
                    setItems(cm); setCategories(cc); setTables(ct);
                    if (cs && cs.length) setSettings(cs[0]);
                    setLoading(false); // Immediate visual feedback
                    console.log('⚡ Loaded from local cache');
                }
            } catch (err) {
                console.warn('Initial cache load failed:', err);
            }

            // Sync Phase: Fetch latest from API in background (Stale-While-Revalidate)
            try {
                const [m, c, t, s] = await Promise.all([
                    fetch('/api/menu').then(r => r.json()).catch(() => null),
                    fetch('/api/categories').then(r => r.json()).catch(() => null),
                    fetch('/api/tables').then(r => r.json()).catch(() => null),
                    fetch('/api/settings').then(r => r.json()).catch(() => null),
                ]);

                if (m) {
                    setItems(m);
                    cacheData('menuItems', m);
                }
                if (c) {
                    setCategories(c);
                    cacheData('categories', c);
                }
                if (t) {
                    setTables(t);
                    cacheData('tables', t);
                }
                if (s) {
                    const settingsData = Array.isArray(s) ? s[0] : s;
                    setSettings(settingsData);
                    cacheData('settings', s);
                }
                console.log('🌐 Background sync complete');
            } catch (err) {
                console.error('Background sync error:', err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

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
    const taxRate = settings?.taxPercentage || 0;
    
    // Calculate Parcel Charges
    const parcelChargesTotal = parcelEnabled 
        ? (parcelOptions.container * PARCEL_CHARGES.container) + (parcelOptions.gravy * PARCEL_CHARGES.gravy)
        : 0;

    const tax = cart.reduce((s, i) => {
        const itemTaxRate = i.tax !== undefined ? i.tax : taxRate;
        return s + (i.price * i.quantity * itemTaxRate) / 100;
    }, 0);
    const total = subtotal + tax + parcelChargesTotal - discount;

    const placeOrder = async (overrideMethod = null) => {
        if (cart.length === 0) { addToast('Add items first', 'warning'); return; }
        
        const method = overrideMethod || paymentMethod;
        const orderData = {
            customerName, customerPhone,
            deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
            items: cart.map(i => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, specialInstructions: i.specialInstructions })),
            subtotal, tax, discount, total,
            type: orderType, paymentMethod: method,
            paymentStatus: 'paid',
            table: selectedTable || undefined,
            orderNotes: notes,
            createdBy: session?.user?.id,
            parcelOptions: parcelEnabled ? { ...parcelOptions, charges: parcelChargesTotal } : null,
        };

        try {
            if (!navigator.onLine) throw new Error('offline');

            const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
            const order = await res.json();
            
            if (!res.ok) throw new Error(order.error || 'Failed to place order');
            
            setLastOrder(order);
            setModalState('success');
            setCart([]);
            setDiscount(0);
            setCustomerName('Walk-in Customer');
            setCustomerPhone('');
            setDeliveryAddress({ street: '', city: '', pincode: '' });
            setNotes('');
            setSelectedTable('');
            setParcelEnabled(false);
            setParcelOptions({ gravy: 0, container: 0 });
            addToast('Order placed successfully!', 'success');

            // Automated Print with 2-second delay
            setPrintCountdown(2);
            const countdownInterval = setInterval(() => {
                setPrintCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        printReceipt();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Refresh tables
            const t = await fetch('/api/tables').then(r => r.json()).catch(() => getCachedData('tables'));
            setTables(t || []);
        } catch (err) { 
            if (err.message === 'offline' || !navigator.onLine || err.name === 'TypeError') {
                const offlineId = `OFF-${Date.now()}`;
                const offlineOrder = { ...orderData, orderId: offlineId, synced: 0, createdAt: new Date().toISOString() };
                await db.offlineOrders.add(offlineOrder);
                
                setLastOrder(offlineOrder);
                setModalState('success');
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
        if (!phone) {
            addToast('Please enter customer phone number', 'warning');
            return;
        }

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
        const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const printReceipt = () => {
        if (!lastOrder) return;
        const win = window.open('', '_blank');
        
        const taxGroups = {};
        lastOrder.items.forEach(item => {
            const tr = item.tax || 0;
            const itemTax = (item.price * item.quantity * tr) / 100;
            taxGroups[tr] = (taxGroups[tr] || 0) + itemTax;
        });

        win.document.write(`
      <html><head><title>Receipt - ${lastOrder.orderId}</title>
      <style>
        @page { margin: 0; }
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        body { 
            font-family: 'Outfit', sans-serif; 
            width: 80mm; 
            margin: 0; 
            padding: 5mm; 
            color: #000;
            font-size: 10.5pt;
            line-height: 1.4;
            -webkit-font-smoothing: antialiased;
        }
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
        <div class="header extra-bold" style="text-transform: uppercase;">${settings?.restaurantName || 'BUSHRA FAMILY RESTAURANT'}</div>
        <div class="info" style="margin-bottom: 2mm;">${settings?.tagline || '⭐ Halal Certified | Premium Dining ⭐'}</div>
        
        <div class="info" style="font-size: 8.5pt;">
            ${settings?.address ? `📍 ${settings.address.replace(/\n/g, '<br>')}` : '📍 496/2 Bangalore Main Road, SS Lodge Ground Floor, Chengam - 606 709'}
        </div>
        
        <div class="info" style="margin-top: 2mm; font-size: 9.5pt;">
            📞 ${settings?.phone || '8838993915 | 9361066673'}
        </div>
      </div>
      
      <div class="line"></div>
      <div style="display:flex; justify-content:space-between; font-size:9.5pt; margin-bottom: 1mm;" class="bold">
        <span>Date: ${new Date(lastOrder.createdAt).toLocaleDateString()}</span>
        <span>Time: ${new Date(lastOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div style="font-size:10.5pt;" class="extra-bold">Bill No: ${lastOrder.orderId}</div>
      <div class="dashed-line"></div>
      
      <table class="table">
        <thead>
          <tr>
            <th style="width:40%">Item</th>
            <th class="qty">Qty</th>
            <th class="price">Rate</th>
            <th class="amt">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${lastOrder.items.map((i) => `
            <tr>
              <td style="width:40%">${i.name}</td>
              <td class="qty">${i.quantity}</td>
              <td class="price">${i.price.toFixed(0)}</td>
              <td class="amt extra-bold">${(i.price * i.quantity).toFixed(0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="dashed-line"></div>
      <div class="total-row"><span>Items Subtotal</span><span>₹ ${lastOrder.subtotal.toFixed(2)}</span></div>
      ${lastOrder.parcelOptions?.charges > 0 ? `
        <div class="total-row">
            <span>Parcel Charges ${lastOrder.parcelOptions.container > 0 ? `(Cont x${lastOrder.parcelOptions.container})` : ''} ${lastOrder.parcelOptions.gravy > 0 ? `(Gravy x${lastOrder.parcelOptions.gravy})` : ''}</span>
            <span>₹ ${lastOrder.parcelOptions.charges.toFixed(2)}</span>
        </div>
      ` : ''}
      ${lastOrder.tax > 0 ? `<div class="total-row"><span>GST</span><span>₹ ${lastOrder.tax.toFixed(2)}</span></div>` : ''}
      ${lastOrder.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-₹ ${lastOrder.discount.toFixed(2)}</span></div>` : ''}
      
      <div class="line"></div>
      <div class="total-row extra-bold" style="font-size:14pt; padding-top:1mm">
        <span>TOTAL</span>
        <span>₹ ${lastOrder.total.toFixed(0)}</span>
      </div>
      <div class="line"></div>
      
      <div class="center bold" style="font-size:10pt; margin-top:3mm; letter-spacing: 0.5px; line-height: 1.5;">
        ${settings?.billFooter?.replace(/\\n/g, '<br>') || '🎉 THANK YOU FOR DINING WITH US! 🎉<br>❤️ We hope you enjoyed your meal'}
      </div>
      
      <div class="center" style="font-size:7pt; color: #666; margin-top: 5mm; border-top: 1px solid #eee; padding-top: 2mm;">
        Software by buildXtechs • Printed on ${new Date().toLocaleString()}
      </div>

      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            window.onafterprint = () => window.close();
            // Fallback for browsers that don't support onafterprint or if cancelled
            setTimeout(() => { if(!window.closed) window.close(); }, 10000);
          }, 500);
        };
      </script>
      </body></html>
    `);
        win.document.close();
    };

    if (loading) return <LoadingAnimation />;

    return (
        <div className="pos-layout">
            <style jsx>{`
                .pos-layout {
                    display: grid;
                    grid-template-columns: 1fr 380px;
                    gap: var(--space-md);
                    height: calc(100vh - 2 * var(--space-md));
                    overflow: hidden;
                }

                @media (max-width: 1200px) {
                    .pos-layout {
                        grid-template-columns: 1fr 320px;
                        gap: var(--space-sm);
                    }
                }

                @media (max-width: 900px) {
                    .pos-layout {
                        grid-template-columns: 1fr 280px;
                        gap: var(--space-xs);
                    }
                }

                    .cart-column {
                        position: relative;
                        height: 100% !important;
                    }
                }

                @media (max-width: 600px) {
                    .pos-layout {
                        display: flex;
                        flex-direction: column;
                    }
                    .cart-column {
                        position: sticky;
                        bottom: 0;
                        max-height: 80vh;
                    }
                }
                .tabs {
                    display: flex;
                    gap: var(--space-xs);
                    overflow-x: auto;
                    padding-bottom: 8px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    border-bottom: 1px solid var(--border-light);
                }
                .tabs::-webkit-scrollbar {
                    display: none;
                }
                .tab {
                    padding: 8px 16px;
                    border-radius: var(--radius-sm);
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    font-size: var(--font-xs);
                    font-weight: 600;
                    white-space: nowrap;
                    cursor: pointer;
                    transition: var(--transition-fast);
                }
                .tab:hover {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                }
                .tab.active {
                    background: var(--gradient-primary);
                    border-color: transparent;
                    color: white;
                    box-shadow: 0 4px 12px rgba(249,115,22,0.2);
                }
            `}</style>
            {/* Left: Menu Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <h2 style={{
                            fontSize: 'var(--font-xl)', fontWeight: 800,
                            background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            margin: 0
                        }}>🍽️ BUSHRA POS</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'var(--space-xs)' }}>
                            <div style={{ 
                                width: 8, height: 8, borderRadius: '50%', 
                                background: isOnline ? '#22c55e' : '#ef4444',
                                boxShadow: isOnline ? '0 0 10px rgba(34,197,94,0.4)' : '0 0 10px rgba(239,68,68,0.4)'
                            }}></div>
                            <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, color: isOnline ? 'var(--text-secondary)' : '#ef4444' }}>
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                            {pendingSync > 0 && (
                                <span className="badge badge-warning" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                    {pendingSync} PENDING SYNC
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                        <input type="text" placeholder="No. (001)" value={itemCode}
                            onChange={e => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                setItemCode(val);
                                if (val.length === 3) {
                                    findAndAddByCode(val);
                                }
                            }}
                            title="Search by Number (e.g. 001)"
                            style={{ 
                                maxWidth: 80, 
                                padding: '8px 12px', 
                                fontSize: 'var(--font-xs)', 
                                border: '2px solid var(--accent-primary)', 
                                borderRadius: 'var(--radius-sm)',
                                textAlign: 'center',
                                fontWeight: 800
                            }} />
                        <input type="search" placeholder="Search items..." value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ maxWidth: 150, padding: '8px 12px', fontSize: 'var(--font-xs)' }} />
                    </div>
                </div>

                <div className="tabs" style={{ marginBottom: 'var(--space-sm)' }}>
                    <button className={`tab ${selectedCategory === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('all')}>All</button>
                    {categories.map(c => (
                        <button key={c._id} className={`tab ${selectedCategory === c._id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(c._id)}>{c.name}</button>
                    ))}
                </div>

                <div style={{
                    flex: 1, overflow: 'auto',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
                    gap: 'var(--space-md)', alignContent: 'start',
                    paddingRight: '4px',
                    paddingBottom: 'var(--space-2xl)'
                }}>
                    {loading ? (
                        <MenuSkeleton />
                    ) : filteredItems.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🔍</div>
                            <h3>No items found</h3>
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <MenuItemCard 
                                key={item._id} 
                                item={item} 
                                inCart={cart.find(i => i._id === item._id)} 
                                onAdd={addToCartPOS} 
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right: Cart & Bill */}
            <div className="cart-column" style={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', height: '100%',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {/* Cart Header */}
                <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                        {['dine_in', 'takeaway', 'delivery'].map(t => (
                            <button key={t} className={`btn btn-sm ${orderType === t ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setOrderType(t)} style={{ flex: 1, fontSize: '10px', textTransform: 'capitalize' }}>
                                {t.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                        <input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                            style={{ flex: 1, minWidth: '120px', padding: '6px 10px', fontSize: 'var(--font-xs)' }} />
                        <input placeholder="Phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                            style={{ flex: 1, minWidth: '120px', padding: '6px 10px', fontSize: 'var(--font-xs)' }} />
                        {orderType === 'dine_in' && (
                            <select value={selectedTable} onChange={e => setSelectedTable(e.target.value)}
                                style={{ width: 100, padding: '6px', fontSize: 'var(--font-xs)' }}>
                                <option value="">Table</option>
                                {tables.filter(t => t.status === 'available').map(t => (
                                    <option key={t._id} value={t._id}>T{t.number}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    {orderType === 'delivery' && (
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                            <input placeholder="Street Address" value={deliveryAddress.street} onChange={e => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })} style={{ flex: 2, padding: '6px 10px', fontSize: 'var(--font-xs)' }} />
                            <input placeholder="City" value={deliveryAddress.city} onChange={e => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })} style={{ flex: 1, padding: '6px 10px', fontSize: 'var(--font-xs)' }} />
                        </div>
                    )}
                    <div style={{ marginTop: 'var(--space-sm)' }}>
                        <input placeholder="Order Notes (Optional)" value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', padding: '6px 10px', fontSize: 'var(--font-xs)' }} />
                    </div>

                    {/* Parcel Options */}
                    <div style={{ 
                        marginTop: 'var(--space-sm)', 
                        padding: '10px', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-light)'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 'var(--font-xs)', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                📦 Container for Parcel
                            </div>
                            <input type="checkbox" checked={parcelEnabled} onChange={e => setParcelEnabled(e.target.checked)} />
                        </label>
                        
                        {parcelEnabled && (
                            <div className="animate-fadeIn" style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                        <input type="checkbox" checked={parcelOptions.container > 0} 
                                            onChange={e => setParcelOptions(prev => ({ ...prev, container: e.target.checked ? Math.max(1, prev.container) : 0 }))} 
                                            style={{ marginRight: 6 }}
                                        />
                                        Container (₹{PARCEL_CHARGES.container})
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button onClick={() => setParcelOptions(prev => ({ ...prev, container: Math.max(0, prev.container - 1) }))}
                                            style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12 }}>-</button>
                                        <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, width: 15, textAlign: 'center' }}>{parcelOptions.container}</span>
                                        <button onClick={() => setParcelOptions(prev => ({ ...prev, container: prev.container + 1 }))}
                                            style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12 }}>+</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                        <input type="checkbox" checked={parcelOptions.gravy > 0} 
                                            onChange={e => setParcelOptions(prev => ({ ...prev, gravy: e.target.checked ? Math.max(1, prev.gravy) : 0 }))} 
                                            style={{ marginRight: 6 }}
                                        />
                                        Gravy (₹{PARCEL_CHARGES.gravy})
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button onClick={() => setParcelOptions(prev => ({ ...prev, gravy: Math.max(0, prev.gravy - 1) }))}
                                            style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12 }}>-</button>
                                        <span style={{ fontSize: 'var(--font-xs)', fontWeight: 700, width: 15, textAlign: 'center' }}>{parcelOptions.gravy}</span>
                                        <button onClick={() => setParcelOptions(prev => ({ ...prev, gravy: prev.gravy + 1 }))}
                                            style={{ width: 20, height: 20, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12 }}>+</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart Items */}
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-sm)' }}>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                            <p style={{ fontSize: 'var(--font-sm)' }}>Select items to add</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item._id} style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                                padding: '8px', borderBottom: '1px solid var(--border)',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 'var(--font-xs)', fontWeight: 600 }}>{item.name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>₹{item.price} each</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <button onClick={() => updateQty(item._id, item.quantity - 1)}
                                        style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}>−</button>
                                    <span style={{ fontWeight: 700, fontSize: 'var(--font-xs)', width: 20, textAlign: 'center' }}>{item.quantity}</span>
                                    <button onClick={() => updateQty(item._id, item.quantity + 1)}
                                        style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}>+</button>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', minWidth: 50, textAlign: 'right' }}>
                                    ₹{(item.price * item.quantity).toFixed(0)}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* Bill */}
                <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-md)' }}>
                    <div style={{ fontSize: 'var(--font-xs)', marginBottom: 'var(--space-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Tax</span><span>₹{tax.toFixed(2)}</span>
                        </div>
                        {parcelEnabled && parcelChargesTotal > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Parcel Charges</span><span>₹{parcelChargesTotal.toFixed(2)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Discount</span>
                            <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                style={{ width: 80, padding: '4px 8px', fontSize: 'var(--font-xs)', textAlign: 'right' }} min="0" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 'var(--font-lg)', paddingTop: 'var(--space-sm)', borderTop: '1px solid var(--border)' }}>
                            <span>Total</span><span style={{ color: 'var(--accent-primary)' }}>₹{total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <button onClick={() => { setCart([]); setDiscount(0); }} className="btn btn-secondary" style={{ flex: 1 }} disabled={cart.length === 0}>Clear</button>
                        <button onClick={() => setModalState('payment')} className="btn btn-primary" style={{ flex: 2 }} disabled={cart.length === 0}>
                            Pay ₹{total.toFixed(0)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Single Unified Checkout Modal */}
            <Modal 
                isOpen={modalState !== 'none'} 
                onClose={() => setModalState('none')} 
                title={modalState === 'payment' ? 'Payment' : 'Order Complete ✅'} 
                width="400px"
            >
                {modalState === 'payment' ? (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                            <div style={{ fontSize: 'var(--font-3xl)', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                ₹{total.toFixed(2)}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                                {cart.reduce((s, i) => s + i.quantity, 0)} items
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                            {[{ v: 'cash', l: '💵 Cash' }, { v: 'card', l: '💳 Card' }, { v: 'upi', l: '📱 UPI' }].map(pm => (
                                <button key={pm.v} 
                                    onClick={() => {
                                        setPaymentMethod(pm.v);
                                        placeOrder(pm.v);
                                    }}
                                    className="card premium-hover" style={{
                                        flex: 1, textAlign: 'center', cursor: 'pointer', padding: 'var(--space-md)',
                                        borderColor: paymentMethod === pm.v ? 'var(--accent-primary)' : 'var(--border)',
                                        background: paymentMethod === pm.v ? 'rgba(249,115,22,0.08)' : 'var(--bg-card)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                    <span style={{ fontSize: 'var(--font-md)', fontWeight: 600 }}>{pm.l}</span>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>Select to Pay</div>
                                </button>
                            ))}
                        </div>
                        <button onClick={() => placeOrder()} className="btn btn-ghost" style={{ width: '100%', border: '1px solid var(--border)' }}>
                            Manual Confirm
                        </button>
                    </div>
                ) : (
                    <div>
                        {lastOrder && (
                            <div>
                                <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
                                    <div style={{ fontSize: 48, marginBottom: 'var(--space-sm)' }}>🎉</div>
                                    <h3>Order #{lastOrder.orderId}</h3>
                                    <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 800, color: 'var(--accent-primary)', marginTop: 'var(--space-sm)' }}>
                                        ₹{lastOrder.total?.toFixed(2)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                                    {printCountdown > 0 && (
                                        <div style={{ 
                                            padding: '8px', 
                                            background: 'rgba(249, 115, 22, 0.1)', 
                                            borderRadius: 'var(--radius-sm)', 
                                            fontSize: 'var(--font-xs)',
                                            textAlign: 'center',
                                            color: 'var(--accent-primary)',
                                            fontWeight: 700,
                                            border: '1px solid rgba(249, 115, 22, 0.2)'
                                        }}>
                                            ⚡ Auto-printing in {printCountdown}s...
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                        <button onClick={printReceipt} className="btn btn-primary" style={{ flex: 1, height: '50px', fontSize: '16px' }}>🖨️ Print Bill</button>
                                        <button onClick={sendWhatsAppBill} className="btn btn-secondary" style={{ flex: 1, height: '50px', fontSize: '16px', background: '#25D366', color: 'white', border: 'none' }}>
                                            <span style={{ marginRight: '8px' }}>💬</span> WhatsApp
                                        </button>
                                    </div>
                                    <button onClick={() => setModalState('none')} className="btn btn-ghost" style={{ width: '100%', marginTop: 'var(--space-sm)' }}>New Order</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
