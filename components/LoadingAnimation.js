'use client';
import { useState, useEffect } from 'react';

export default function LoadingAnimation({ fullScreen = false }) {
    const [logo, setLogo] = useState('/images/logo.png');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data && data.logoUrl) setLogo(data.logoUrl);
            } catch (err) {
                // Fallback to default logo already set in state
            }
        };
        fetchSettings();
    }, []);

    const content = (
        <div className="logo-loader">
            <div className="logo-container">
                <img src={logo} alt="Loading..." className="pulsing-logo" 
                    onError={(e) => { e.target.src = '/images/logo.png'; }} />
                <div className="glow"></div>
            </div>
            <p className="loading-text">BUSHRA FAMILY RESTAURANT</p>

            <style jsx>{`
                .logo-loader {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                }
                .logo-container {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 15px;
                }
                .pulsing-logo {
                    width: 90px;
                    height: 90px;
                    object-fit: contain;
                    z-index: 2;
                    animation: pulse-logo 2s ease-in-out infinite;
                    filter: drop-shadow(0 0 10px rgba(0,0,0,0.1));
                }
                .glow {
                    position: absolute;
                    width: 70px;
                    height: 70px;
                    background: var(--accent-primary);
                    border-radius: 50%;
                    filter: blur(30px);
                    opacity: 0.3;
                    z-index: 1;
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                .loading-text {
                    font-weight: 800;
                    color: var(--text-primary);
                    font-size: 12px;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    opacity: 0.7;
                    animation: text-shine 2s linear infinite;
                    background: linear-gradient(to right, var(--text-primary) 20%, var(--accent-primary) 50%, var(--text-primary) 80%);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                @keyframes pulse-logo {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(249,115,22,0.2)); }
                    50% { transform: scale(1.08); filter: drop-shadow(0 0 20px rgba(249,115,22,0.4)); }
                }
                @keyframes pulse-glow {
                    0%, 100% { transform: scale(1); opacity: 0.2; }
                    50% { transform: scale(1.8); opacity: 0.5; }
                }
                @keyframes text-shine {
                    to { background-position: 200% center; }
                }
            `}</style>
        </div>
    );

    if (fullScreen) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'var(--bg-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999
            }}>
                {content}
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '300px', width: '100%'
        }}>
            {content}
        </div>
    );
}
