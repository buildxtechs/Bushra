'use client';
import { memo } from 'react';
import Image from 'next/image';

const MenuItemCard = ({ item, inCart, onAdd }) => {
    return (
        <div onClick={() => onAdd(item)}
            className="menu-item-card premium-hover animate-fadeIn"
            style={{
                background: inCart ? 'rgba(249,115,22,0.1)' : 'var(--bg-card)',
                border: `1px solid ${inCart ? 'var(--accent-primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-sm)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                position: 'relative',
                overflow: 'hidden'
            }}>
            {inCart && (
                <span className="qty-badge animate-bounceIn">{inCart.quantity}</span>
            )}
            <div className="item-image-container shimmer-effect">
                <span className="item-code">{item.code}</span>
                {item.image ? (
                    <Image
                        src={item.image}
                        alt={item.name}
                        width={125}
                        height={100}
                        style={{ objectFit: 'cover' }}
                        loading="lazy"
                    />
                ) : (
                    <span style={{ fontSize: 32 }}>🍽️</span>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span className={`veg-badge ${item.isVeg ? 'veg' : 'non-veg'}`} style={{ transform: 'scale(0.8)' }}></span>
                <span className="item-name">{item.name}</span>
            </div>
            <div className="item-price">₹{item.price}</div>

            <style jsx>{`
                .menu-item-card:hover {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    border-color: var(--accent-primary);
                    transform: translateY(-1px);
                }
                .item-image-container {
                    height: 100px;
                    border-radius: var(--radius-sm);
                    margin-bottom: 8px;
                    background: var(--bg-glass-light);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    border: 1px solid var(--border-light);
                    position: relative;
                }
                .item-code {
                    position: absolute;
                    top: 4px;
                    left: 4px;
                    padding: 2px 4px;
                    background: rgba(0,0,0,0.6);
                    color: white;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: 800;
                    z-index: 10;
                }
                .qty-badge {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    background: var(--accent-primary);
                    color: white;
                    font-size: 10px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 20;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .item-name {
                    font-size: var(--font-xs);
                    font-weight: 600;
                    line-height: 1.2;
                    flex: 1;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .item-price {
                    fontWeight: 800;
                    fontSize: var(--font-sm);
                    color: var(--accent-primary);
                }
            `}</style>
        </div>
    );
};

export default memo(MenuItemCard);
