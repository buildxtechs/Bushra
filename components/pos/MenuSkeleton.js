'use client';

export default function MenuSkeleton() {
    return (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))',
            gap: 'var(--space-xs)', alignContent: 'start',
            paddingRight: '4px'
        }}>
            {[...Array(12)].map((_, i) => (
                <div key={i} className="card animate-pulse" style={{ padding: 'var(--space-sm)', opacity: 0.5 }}>
                    <div style={{ height: 100, borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass-light)', marginBottom: 8 }}></div>
                    <div style={{ height: 12, borderRadius: 4, background: 'var(--bg-glass-light)', marginBottom: 4, width: '80%' }}></div>
                    <div style={{ height: 12, borderRadius: 4, background: 'var(--bg-glass-light)', width: '40%' }}></div>
                </div>
            ))}
            <style jsx>{`
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.2; }
                }
            `}</style>
        </div>
    );
}
