'use client';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components/Toast';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/Modal';
import { db, cacheData, getCachedData } from '@/lib/offline-db';

export default function AdminPOS() {
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
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const { addToast } = useToast();

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [m, c, t, s] = await Promise.all([
                    fetch('/api/menu').then(r => r.json()).catch(() => getCachedData('menuItems')),
                    fetch('/api/categories').then(r => r.json()).catch(() => getCachedData('categories')),
                    fetch('/api/tables').then(r => r.json()).catch(() => getCachedData('tables')),
                    fetch('/api/settings').then(r => r.json()).catch(() => getCachedData('settings')),
                ]);

                setItems(m || []); setCategories(c || []); setTables(t || []); setSettings(s && s.length ? s[0] : s);
                
                // Update local cache for next offline run
                if (navigator.onLine) {
                    cacheData('menuItems', m);
                    cacheData('categories', c);
                    cacheData('tables', t);
                    cacheData('settings', s);
                }
            } catch (err) {
                console.error('Data load error:', err);
                const [cm, cc, ct, cs] = await Promise.all([
                    getCachedData('menuItems'), getCachedData('categories'),
                    getCachedData('tables'), getCachedData('settings')
                ]);
                setItems(cm); setCategories(cc); setTables(ct); setSettings(cs[0] || cs);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const filteredItems = items.filter(item => {
        const itemCatId = (item.category && typeof item.category === 'object') ? item.category._id : item.category;
        const matchCat = selectedCategory === 'all' || itemCatId === selectedCategory;
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        return matchCat && matchSearch;
    });

    const addToCartPOS = (item) => {
        setCart(prev => {
            const existing = prev.find(i => i._id === item._id);
            if (existing) return prev.map(i => i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { ...item, quantity: 1, specialInstructions: '' }];
        });
    };

    const updateQty = (id, qty) => {
        if (qty <= 0) { setCart(prev => prev.filter(i => i._id !== id)); return; }
        setCart(prev => prev.map(i => i._id === id ? { ...i, quantity: qty } : i));
    };

    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const taxRate = settings?.taxPercentage || 0;
    const tax = cart.reduce((s, i) => {
        const itemTaxRate = i.tax !== undefined ? i.tax : taxRate;
        return s + (i.price * i.quantity * itemTaxRate) / 100;
    }, 0);
    const total = subtotal + tax - discount;

    const placeOrder = async () => {
        if (cart.length === 0) { addToast('Add items first', 'warning'); return; }
        try {
            const orderData = {
                customerName, customerPhone,
                deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
                items: cart.map(i => ({ menuItem: i._id, name: i.name, price: i.price, quantity: i.quantity, specialInstructions: i.specialInstructions })),
                subtotal, tax, discount, total,
                type: orderType, paymentMethod,
                paymentStatus: 'paid',
                table: selectedTable || undefined,
                orderNotes: notes,
                createdBy: session?.user?.id,
            };
            const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
            const order = await res.json();
            
            if (!res.ok) throw new Error(order.error);

            setLastOrder(order);
            setShowPayment(false);
            setShowReceipt(true);
            setCart([]);
            setDiscount(0);
            setCustomerName('Walk-in Customer');
            setCustomerPhone('');
            setDeliveryAddress({ street: '', city: '', pincode: '' });
            setNotes('');
            setSelectedTable('');
            addToast('Order placed!', 'success');

            // Refresh tables
            const t = await fetch('/api/tables').then(r => r.json()).catch(() => getCachedData('tables'));
            setTables(t || []);
        } catch (err) { 
            // Save to offline local DB if net is down
            if (!navigator.onLine || err.message === 'Failed to fetch') {
                const offlineId = `OFF-${Date.now()}`;
                const offlineOrder = { ...orderData, orderId: offlineId, synced: 0, createdAt: new Date().toISOString() };
                await db.offlineOrders.add(offlineOrder);
                
                setLastOrder(offlineOrder);
                setShowPayment(false);
                setShowReceipt(true);
                setCart([]);
                setDiscount(0);
                setCustomerName('Walk-in Customer');
                setCustomerPhone('');
                setDeliveryAddress({ street: '', city: '', pincode: '' });
                setNotes('');
                setSelectedTable('');
                addToast('Saved locally (Offline). Syncing later.', 'warning');
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
        <div class="header extra-bold">${settings?.restaurantName || 'BUSHRA FAMILY RESTAURANT'}</div>
        <div class="info">${settings?.billHeader || '496/2 Bangalore Main Road, SS Lodge Ground Floor, Chengam'}</div>
        <div class="info">Ph: ${settings?.phone || '8838993915'}</div>
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
      <div class="total-row"><span>Subtotal Total</span><span>₹ ${lastOrder.subtotal.toFixed(2)}</span></div>
      ${lastOrder.tax > 0 ? `<div class="total-row"><span>GST</span><span>₹ ${lastOrder.tax.toFixed(2)}</span></div>` : ''}
      ${lastOrder.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-₹ ${lastOrder.discount.toFixed(2)}</span></div>` : ''}
      
      <div class="line"></div>
      <div class="total-row extra-bold" style="font-size:14pt; padding-top:1mm">
        <span>TOTAL</span>
        <span>₹ ${lastOrder.total.toFixed(0)}</span>
      </div>
      <div class="line"></div>
      
      <div class="center bold" style="font-size:9.5pt; margin-top:2mm; letter-spacing: 0.5px;">
        ${settings?.billFooter?.replace(/\\n/g, '<br>') || 'THANK YOU! VISIT AGAIN 🙏'}
      </div>
      
      <div class="center" style="font-size:7pt; color: #666; margin-top: 4mm;">
        Printed on ${new Date().toLocaleString()}
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

                @media (max-width: 768px) {
                    .pos-layout {
                        grid-template-columns: 1fr;
                        height: auto;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                    }
                    .cart-column {
                        position: sticky;
                        bottom: 0;
                        height: auto !important;
                        max-height: 80vh;
                        z-index: 100;
                        box-shadow: 0 -10px 25px rgba(0,0,0,0.1);
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
                    <h2 style={{
                        fontSize: 'var(--font-xl)', fontWeight: 800,
                        background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>🍽️ BUSHRA POS</h2>
                    <div style={{ flex: 1 }} />
                    <input type="search" placeholder="Search items..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ maxWidth: 200, padding: '8px 12px', fontSize: 'var(--font-xs)' }} />
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
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))',
                    gap: 'var(--space-xs)', alignContent: 'start',
                    paddingRight: '4px'
                }}>
                    {filteredItems.map(item => {
                        const inCart = cart.find(i => i._id === item._id);
                        return (
                            <div key={item._id} onClick={() => addToCartPOS(item)}
                                style={{
                                    background: inCart ? 'rgba(249,115,22,0.1)' : 'var(--bg-card)',
                                    border: `1px solid ${inCart ? 'var(--accent-primary)' : 'var(--border)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    padding: 'var(--space-sm)',
                                    cursor: 'pointer',
                                    transition: 'var(--transition-fast)',
                                    position: 'relative',
                                }}>
                                {inCart && (
                                    <span style={{
                                        position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                                        borderRadius: '50%', background: 'var(--accent-primary)', color: 'white',
                                        fontSize: '10px', fontWeight: 800,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 2,
                                    }}>{inCart.quantity}</span>
                                )}
                                <div style={{ 
                                    height: 100, borderRadius: 'var(--radius-sm)', marginBottom: 8, 
                                    background: item.image ? `url(${item.image}) center/cover` : 'var(--bg-glass-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', border: '1px solid var(--border-light)'
                                }}>
                                    {!item.image && <span style={{ fontSize: 32 }}>🍽️</span>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    <span className={`veg-badge ${item.isVeg ? 'veg' : 'non-veg'}`} style={{ transform: 'scale(0.8)' }}></span>
                                    <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600, lineHeight: 1.2, flex: 1 }}>{item.name}</span>
                                </div>
                                <div style={{ fontWeight: 800, fontSize: 'var(--font-sm)', color: 'var(--accent-primary)' }}>₹{item.price}</div>
                            </div>
                        );
                    })}
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
                        <button onClick={() => setShowPayment(true)} className="btn btn-primary" style={{ flex: 2 }} disabled={cart.length === 0}>
                            Pay ₹{total.toFixed(0)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Payment" width="400px">
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
                        <button key={pm.v} onClick={() => setPaymentMethod(pm.v)}
                            className="card" style={{
                                flex: 1, textAlign: 'center', cursor: 'pointer', padding: 'var(--space-md)',
                                borderColor: paymentMethod === pm.v ? 'var(--accent-primary)' : 'var(--border)',
                                background: paymentMethod === pm.v ? 'rgba(249,115,22,0.08)' : 'var(--bg-card)',
                            }}>
                            <span style={{ fontSize: 'var(--font-md)', fontWeight: 600 }}>{pm.l}</span>
                        </button>
                    ))}
                </div>
                <button onClick={placeOrder} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                    Complete Payment
                </button>
            </Modal>

            {/* Receipt Modal */}
            <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="Order Complete ✅" width="400px">
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
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <button onClick={printReceipt} className="btn btn-primary" style={{ flex: 1, height: '50px', fontSize: '16px' }}>🖨️ Print Bill</button>
                                <button onClick={sendWhatsAppBill} className="btn btn-secondary" style={{ flex: 1, height: '50px', fontSize: '16px', background: '#25D366', color: 'white', border: 'none' }}>
                                    <span style={{ marginRight: '8px' }}>💬</span> WhatsApp
                                </button>
                            </div>
                            <button onClick={() => setShowReceipt(false)} className="btn btn-ghost" style={{ width: '100%', marginTop: 'var(--space-sm)' }}>New Order</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
