'use client';

export default function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', margin = '0' }) {
    return (
        <div className="skeleton-box" style={{ width, height, borderRadius, margin }}>
            <style jsx>{`
                .skeleton-box {
                    position: relative;
                    overflow: hidden;
                    background-color: rgba(255, 255, 255, 0.05);
                }
                .skeleton-box::after {
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    transform: translateX(-100%);
                    background-image: linear-gradient(
                        90deg,
                        rgba(255, 255, 255, 0) 0,
                        rgba(255, 255, 255, 0.03) 20%,
                        rgba(255, 255, 255, 0.06) 60%,
                        rgba(255, 255, 255, 0)
                    );
                    animation: shimmer 2s infinite;
                    content: '';
                }
                @keyframes shimmer {
                    100% {
                        transform: translateX(100%);
                    }
                }
            `}</style>
        </div>
    );
}

export function SkeletonInput() {
    return (
        <div style={{ marginBottom: 'var(--space-md)' }}>
            <Skeleton width="40%" height="14px" margin="0 0 8px 0" />
            <Skeleton width="100%" height="42px" />
        </div>
    );
}

export function SkeletonRow() {
    return (
        <div style={{ display: 'flex', gap: 'var(--space-md)', padding: '16px 0', borderBottom: '1px solid var(--border-light)' }}>
            <Skeleton width="40px" height="40px" borderRadius="var(--radius-sm)" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton width="60%" height="16px" />
                <Skeleton width="30%" height="12px" />
            </div>
            <Skeleton width="80px" height="24px" borderRadius="12px" />
            <Skeleton width="60px" height="24px" borderRadius="12px" />
        </div>
    );
}
