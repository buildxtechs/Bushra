'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/offline-db';
import bcrypt from 'bcryptjs';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                // If network error, attempt offline login
                if (result.error.toLowerCase().includes('fetch') || result.status === 401) {
                    const offlineUser = await db.users.get({ email });
                    if (offlineUser) {
                        const passwordsMatch = await bcrypt.compare(password, offlineUser.passwordHash);
                        if (passwordsMatch) {
                            addToast('Logging in offline...', 'info');
                            // We can't actually trigger NextAuth session offline easily without a server,
                            // but we can set a temporary local session flag for the PWA.
                            localStorage.setItem('offline_session', JSON.stringify({
                                email: offlineUser.email,
                                name: offlineUser.name,
                                role: offlineUser.role,
                                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                            }));
                            
                            if (offlineUser.role === 'admin') router.push('/admin/dashboard');
                            else if (offlineUser.role === 'delivery') router.push('/delivery');
                            else router.push('/menu');
                            return;
                        }
                    }
                }
                setError(result.error);
                setLoading(false);
            } else {
                // Successful online login - cache the user
                const res = await fetch('/api/auth/session');
                const session = await res.json();
                
                if (session?.user) {
                    const salt = await bcrypt.genSalt(10);
                    const hash = await bcrypt.hash(password, salt);
                    await db.users.put({
                        email: session.user.email,
                        name: session.user.name,
                        role: session.user.role,
                        passwordHash: hash
                    });
                }

                const role = session?.user?.role;
                if (role === 'admin') router.push('/admin/dashboard');
                else if (role === 'delivery') router.push('/delivery');
                else router.push('/menu');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An unexpected error occurred');
            setLoading(false);
        }
    };

    const handleAdminQuickLogin = async () => {
        setEmail('admin@restaurant.com');
        setPassword('admin123');
        setLoading(true);
        const result = await signIn('credentials', {
            email: 'admin@restaurant.com',
            password: 'admin123',
            redirect: false,
        });
        if (result?.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push('/admin/dashboard');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: 'var(--space-md)',
        }}>
            <div style={{
                width: '100%',
                maxWidth: 420,
                animation: 'slideUp 0.4s ease',
            }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    <div style={{
                        width: 100,
                        height: 100,
                        margin: '0 auto',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(249, 115, 22, 0.3)',
                        border: '2px solid rgba(249, 115, 22, 0.4)',
                    }}>
                        <Image
                            src="/images/logo.png"
                            alt="BUSHRA Family Restaurant Logo"
                            width={96}
                            height={96}
                            style={{ objectFit: 'contain' }}
                            priority
                        />
                    </div>
                    <h1 style={{
                        fontSize: 'var(--font-3xl)',
                        fontWeight: 800,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginTop: 'var(--space-md)',
                    }}>BUSHRA Family Restaurant</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-xs)' }}>
                        Sign in to your account
                    </p>
                </div>

                <div className="card" style={{ padding: 'var(--space-xl)' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {error && (
                            <div style={{
                                background: 'var(--danger-bg)',
                                color: 'var(--danger)',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-sm)',
                            }}>
                                {error}
                            </div>
                        )}

                        <div className="input-group">
                            <label>Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email" required />
                        </div>

                        <div className="input-group">
                            <label>Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password" required />
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}
                            style={{ width: '100%', marginTop: 'var(--space-sm)' }}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div style={{ margin: 'var(--space-lg) 0', textAlign: 'center', position: 'relative' }}>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                        <span style={{ 
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            background: 'var(--bg-card)', padding: '0 10px', fontSize: 'var(--font-xs)', color: 'var(--text-muted)'
                        }}>OR</span>
                    </div>

                    <button onClick={handleAdminQuickLogin} className="btn btn-secondary btn-lg" disabled={loading}
                        style={{ width: '100%', border: '2px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                        Admin Login
                    </button>

                    <div style={{
                        textAlign: 'center',
                        marginTop: 'var(--space-lg)',
                        fontSize: 'var(--font-sm)',
                        color: 'var(--text-secondary)',
                    }}>
                        Don&apos;t have an account?{' '}
                        <Link href="/register" style={{ fontWeight: 600 }}>Register</Link>
                    </div>
                </div>

                <div style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-lg)',
                    fontSize: 'var(--font-xs)',
                    color: 'var(--text-muted)',
                }}>
                    <p>Demo Credentials:</p>
                    <p>Admin: admin@restaurant.com / admin123</p>
                </div>
            </div>
        </div>
    );
}
