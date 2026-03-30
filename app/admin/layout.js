'use client';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            if (status === 'loading') return;
            
            const offlineSessionStr = localStorage.getItem('offline_session');
            const offlineSession = offlineSessionStr ? JSON.parse(offlineSessionStr) : null;
            
            // Validate offline session (e.g., expiry)
            const isOfflineAuth = offlineSession && new Date(offlineSession.expires) > new Date();

            if (status === 'unauthenticated' && !isOfflineAuth) {
                router.push('/login');
            }
            
            if (session && session.user.role !== 'admin') {
                router.push('/');
            } else if (!session && isOfflineAuth && offlineSession.role !== 'admin') {
                 router.push('/');
            }
        };
        
        checkAuth();
    }, [session, status, router]);

    if (status === 'loading') return <LoadingAnimation fullScreen={true} />;
    
    // Check if we have an offline session even if NextAuth is not active
    const offlineSessionStr = typeof window !== 'undefined' ? localStorage.getItem('offline_session') : null;
    const isOfflineActive = !session && offlineSessionStr && new Date(JSON.parse(offlineSessionStr).expires) > new Date();

    if (status === 'unauthenticated' && !isOfflineActive) return null;

    return (
        <div className={`dashboard-layout ${!isSidebarOpen ? 'sidebar-hidden' : ''}`}>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            
            {/* Mobile Header */}
            <header className="mobile-header" style={{
                display: 'none',
                position: 'fixed',
                top: 0, left: 0, right: 0,
                height: 70,
                background: 'var(--bg-glass)',
                backdropFilter: 'blur(15px)',
                borderBottom: '1px solid var(--border)',
                zIndex: 110,
                padding: '0 var(--space-md)',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-md)'
            }}>
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="btn btn-icon"
                    style={{ 
                        background: 'rgba(249, 115, 22, 0.1)', 
                        border: '1px solid rgba(249, 115, 22, 0.2)', 
                        fontSize: 24,
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-md)'
                    }}
                >
                    ☰
                </button>
                <div style={{ 
                    fontWeight: 900, 
                    fontSize: 'var(--font-md)', 
                    background: 'var(--gradient-primary)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '1px'
                }}>
                    BUSHRA ADMIN
                </div>
                <div style={{ width: 44 }} />
            </header>

            <div 
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
                onClick={() => setIsSidebarOpen(false)} 
            />

            <main className="dashboard-content">
                <style jsx global>{`
                    @media (max-width: 992px) {
                        .mobile-header { display: flex !important; }
                        .dashboard-content { padding-top: 80px !important; }
                    }
                `}</style>
                {children}
            </main>
        </div>
    );
}
