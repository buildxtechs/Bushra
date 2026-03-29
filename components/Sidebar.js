'use client';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

export default function Sidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = session?.user?.role;

    // Auto-close on mobile when path changes
    useEffect(() => {
        if (onClose) onClose();
    }, [pathname]);

    const menuGroups = [
        {
            title: 'Operations',
            links: [
                { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
                { href: '/admin/pos', label: 'POS Terminal', icon: '🖥️' },
                { href: '/admin/orders', label: 'Orders', icon: '📦' },
                { href: '/admin/kitchen', label: 'Kitchen Display', icon: '👨‍🍳' },
            ]
        },
        {
            title: 'Menu & Inventory',
            links: [
                { href: '/admin/menu', label: 'Menu Management', icon: '🍽️' },
                { href: '/admin/categories', label: 'Categories', icon: '📂' },
                { href: '/admin/inventory', label: 'Inventory', icon: '📦' },
                { href: '/admin/tables', label: 'Tables', icon: '🪑' },
            ]
        },
        {
            title: 'Administration',
            links: [
                { href: '/admin/customers', label: 'Customers', icon: '👥' },
                { href: '/admin/staff', label: 'Staff', icon: '👨‍💼' },
                { href: '/admin/coupons', label: 'Coupons', icon: '🎫' },
            ]
        },
        {
            title: 'Accounts & System',
            links: [
                { href: '/admin/expenses', label: 'Expenses', icon: '💸' },
                { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
            ]
        }
    ];

    const deliveryLinks = [
        { title: 'Delivery', links: [{ href: '/delivery', label: 'My Deliveries', icon: '🚗' }] },
    ];

    const activeGroups = role === 'admin' ? menuGroups : deliveryLinks;
    const title = role === 'admin' ? 'Admin Panel' : 'Delivery';

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
            width: 'var(--sidebar-width)',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            overflowY: 'auto',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
            <style jsx>{`
                @media (max-width: 992px) {
                    aside {
                        transform: translateX(${isOpen ? '0' : '-100%'});
                        box-shadow: ${isOpen ? 'var(--shadow-lg)' : 'none'};
                    }
                }
                .nav-group-title {
                    font-size: 10px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    margin: var(--space-md) 0 var(--space-xs) var(--space-sm);
                    font-weight: 700;
                }
            `}</style>
            <div style={{
                padding: 'var(--space-lg)',
                borderBottom: '1px solid var(--border)',
            }}>
                <Link href="/" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 'var(--radius-full)',
                            overflow: 'hidden',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 0 12px rgba(249, 115, 22, 0.2)',
                        }}>
                            <Image
                                src="/images/logo.png"
                                alt="BUSHRA Logo"
                                width={40}
                                height={40}
                                style={{ objectFit: 'contain' }}
                            />
                        </div>
                        <div>
                            <div style={{
                                fontSize: 'var(--font-lg)',
                                fontWeight: 800,
                                background: 'var(--gradient-primary)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: 1
                            }}>BUSHRA<br /><span style={{ fontSize: 'var(--font-xs)' }}>Family Restaurant</span></div>
                            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{title}</span>
                        </div>
                    </div>
                </Link>
            </div>

            <nav style={{ padding: 'var(--space-sm) var(--space-md)', flex: 1 }}>
                {activeGroups.map((group, gIdx) => (
                    <div key={gIdx} style={{ marginBottom: 'var(--space-md)' }}>
                        <div className="nav-group-title">{group.title}</div>
                        {group.links.map(link => {
                            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                            return (
                                <Link key={link.href} href={link.href} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-sm)',
                                    padding: '8px 14px',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: '2px',
                                    fontSize: 'var(--font-sm)',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    background: isActive ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                    transition: 'var(--transition-fast)',
                                    textDecoration: 'none',
                                }}>
                                    <span style={{ fontSize: '18px' }}>{link.icon}</span>
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div style={{
                padding: 'var(--space-md)',
                borderTop: '1px solid var(--border)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                    padding: '8px',
                }}>
                    <div style={{
                        width: 36, height: 36,
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 'var(--font-sm)',
                        color: 'white',
                    }}>
                        {session?.user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>{session?.user?.name || 'User'}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{role}</div>
                    </div>
                </div>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn btn-secondary" style={{ width: '100%' }}>
                    🚪 Logout
                </button>
            </div>
        </aside>
    );
}
