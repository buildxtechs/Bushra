'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/contexts/CartContext';

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();
    const { data: session } = useSession();
    const { itemCount } = useCart();
    const [offlineUser, setOfflineUser] = useState(null);

    // Offline Session Support
    useEffect(() => {
        if (!session) {
            const stored = localStorage.getItem('offline_session');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (new Date(parsed.expires) > new Date()) {
                    setOfflineUser(parsed);
                } else {
                    localStorage.removeItem('offline_session');
                }
            }
        } else {
            setOfflineUser(null);
        }
    }, [session]);

    const activeUser = session?.user || offlineUser;
    const isLoggedIn = !!activeUser;

    const links = [
        { href: '/', label: 'Home' },
        { href: '/menu', label: 'Menu' },
    ];

    const authLinks = isLoggedIn ? [
        { href: '/orders', label: 'Orders' },
        { href: '/profile', label: 'Profile' },
    ] : [];
    
    const isAdmin = activeUser?.role === 'admin';
    if (isAdmin) {
        authLinks.push({ href: '/admin/dashboard', label: 'Dashboard' });
    }

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            height: 'var(--navbar-height)',
            background: 'rgba(10, 14, 26, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--border)',
            zIndex: 100,
            display: 'flex', alignItems: 'center',
            padding: '0 var(--space-xl)',
        }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Image
                        src="/images/logo.png"
                        alt="BUSHRA Logo"
                        width={36}
                        height={36}
                        style={{ objectFit: 'contain' }}
                    />
                </div>
                <span style={{
                    fontSize: 'var(--font-xl)', fontWeight: 800,
                    background: 'var(--gradient-primary)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>BUSHRA</span>
            </Link>

            <div style={{ flex: 1 }} />

            {/* Desktop Links */}
            <div className="nav-links-desktop" style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-lg)',
            }}>
                {[...links, ...authLinks].map(link => (
                    <Link key={link.href} href={link.href} style={{
                        fontSize: 'var(--font-sm)', fontWeight: 500,
                        color: pathname === link.href ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        textDecoration: 'none', transition: 'var(--transition-fast)',
                    }}>{link.label}</Link>
                ))}

                {isLoggedIn && (
                    <Link href="/cart" style={{
                        position: 'relative', textDecoration: 'none',
                        fontSize: 'var(--font-sm)', fontWeight: 500,
                        color: pathname === '/cart' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}>
                        🛒 Cart
                        {itemCount > 0 && (
                            <span style={{
                                position: 'absolute', top: -8, right: -12,
                                background: 'var(--accent-primary)',
                                color: 'white', fontSize: '10px', fontWeight: 700,
                                width: 18, height: 18, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{itemCount}</span>
                        )}
                    </Link>
                )}

                {isLoggedIn ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase' }}>
                                {offlineUser ? 'Offline' : (activeUser?.role || 'User')}
                            </span>
                            <span style={{ fontSize: 'var(--font-xs)', fontWeight: 600 }}>{activeUser?.name}</span>
                        </div>
                        <button onClick={() => {
                            localStorage.removeItem('offline_session');
                            signOut({ callbackUrl: '/' });
                        }} className="btn btn-secondary btn-sm">Logout</button>
                    </div>
                ) : (
                    <Link href="/login" className="btn btn-primary btn-sm">Login</Link>
                )}
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
                display: 'none', background: 'none', border: 'none',
                color: 'var(--text-primary)', fontSize: '24px', cursor: 'pointer',
            }} className="mobile-menu-btn">
                {menuOpen ? '✕' : '☰'}
            </button>

            {/* Mobile Menu */}
            {menuOpen && (
                <div style={{
                    position: 'fixed', top: 'var(--navbar-height)', left: 0, right: 0,
                    background: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border)',
                    padding: 'var(--space-md)',
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)',
                }}>
                    {[...links, ...authLinks].map(link => (
                        <Link key={link.href} href={link.href}
                            onClick={() => setMenuOpen(false)}
                            style={{
                                padding: '10px', fontSize: 'var(--font-sm)',
                                color: 'var(--text-secondary)', textDecoration: 'none',
                                borderRadius: 'var(--radius-sm)',
                            }}>{link.label}</Link>
                    ))}
                    {isLoggedIn && (
                        <Link href="/cart" onClick={() => setMenuOpen(false)}
                            style={{ padding: '10px', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                            🛒 Cart ({itemCount})
                        </Link>
                    )}
                    {isLoggedIn ? (
                        <button onClick={() => { 
                            localStorage.removeItem('offline_session');
                            signOut({ callbackUrl: '/' }); 
                            setMenuOpen(false); 
                        }} className="btn btn-secondary" style={{ marginTop: '8px' }}>Logout ({activeUser?.name})</button>
                    ) : (
                        <Link href="/login" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Login</Link>
                    )}
                </div>
            )}

            <style jsx global>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
        </nav>
    );
}
