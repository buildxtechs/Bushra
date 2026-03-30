'use client';

export const Shimmer = () => (
    <style jsx global>{`
        @keyframes shimmer {
            0% { background-position: -468px 0; }
            100% { background-position: 468px 0; }
        }
        .skeleton {
            background: #f6f7f8;
            background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%);
            background-repeat: no-repeat;
            background-size: 800px 104px; 
            display: inline-block;
            position: relative;
            animation: shimmer 1.2s linear infinite forwards;
            border-radius: 4px;
        }
        [data-theme='dark'] .skeleton {
            background: #1e1e1e;
            background-image: linear-gradient(to right, #1e1e1e 0%, #2a2a2a 20%, #1e1e1e 40%, #1e1e1e 100%);
        }
    `}</style>
);

export const Skeleton = ({ width, height, borderRadius = '4px', className = '' }) => (
    <div className={`skeleton ${className}`} style={{ width, height, borderRadius }} />
);

export const SkeletonTable = ({ rows = 5, cols = 5 }) => (
    <div style={{ width: '100%', overflow: 'hidden' }}>
        <Shimmer />
        <div style={{ padding: '20px', display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)' }}>
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} width={`${100/cols}%`} height="24px" />
            ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} style={{ padding: '20px', display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', opacity: 1 - (i * 0.1) }}>
                {Array.from({ length: cols }).map((_, j) => (
                    <Skeleton key={j} width={`${100/cols}%`} height="20px" />
                ))}
            </div>
        ))}
    </div>
);

export const SkeletonCard = ({ height = '200px' }) => (
    <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <Shimmer />
        <Skeleton width="40%" height="24px" />
        <Skeleton width="100%" height={height} />
        <div style={{ display: 'flex', gap: '10px' }}>
            <Skeleton width="80px" height="32px" />
            <Skeleton width="120px" height="32px" />
        </div>
    </div>
);
