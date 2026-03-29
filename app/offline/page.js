'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function OfflinePage() {
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        const handleStatus = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatus);
        window.addEventListener('offline', handleStatus);
        return () => {
            window.removeEventListener('online', handleStatus);
            window.removeEventListener('offline', handleStatus);
        };
    }, []);

    if (isOnline) {
        window.location.href = '/';
        return null;
    }

    return (
        <div className="offline-container">
            <div className="offline-content card animate-slideUp">
                <div className="offline-icon">📶</div>
                <h1>You're Offline</h1>
                <p>Internet connection was lost, but don't worry! BUSHRA POS works perfectly offline. You can still take orders and generate bills. They will sync automatically when you're back online.</p>
                
                <div className="offline-actions">
                    <Link href="/admin/pos" className="btn btn-primary btn-lg">
                        Go to POS Terminal
                    </Link>
                    <button onClick={() => window.location.reload()} className="btn btn-secondary">
                        Try Reloading
                    </button>
                </div>

                <div className="status-badge badge badge-warning">
                    Running in Offline Mode
                </div>
            </div>

            <style jsx>{`
                .offline-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    padding: var(--space-lg);
                    background: var(--bg-primary);
                }
                .offline-content {
                    max-width: 500px;
                    text-align: center;
                    padding: var(--space-2xl) !important;
                }
                .offline-icon {
                    font-size: 64px;
                    margin-bottom: var(--space-lg);
                    filter: grayscale(1);
                    opacity: 0.5;
                }
                h1 {
                    font-size: var(--font-3xl);
                    font-weight: 800;
                    margin-bottom: var(--space-md);
                    background: var(--gradient-primary);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                p {
                    color: var(--text-secondary);
                    margin-bottom: var(--space-xl);
                    line-height: 1.6;
                }
                .offline-actions {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-md);
                    margin-bottom: var(--space-xl);
                }
                .status-badge {
                    margin-top: var(--space-md);
                }
            `}</style>
        </div>
    );
}
