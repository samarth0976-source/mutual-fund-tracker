import React from 'react';

/**
 * AnimatedCard - Reusable card with hover effects and glassmorphism
 */
const AnimatedCard = ({
    children,
    className = '',
    onClick,
    variant = 'default', // default, gradient, glass
    hover = true,
    glow = false
}) => {
    const baseStyles = 'rounded-2xl transition-all duration-300 ease-out';

    const variants = {
        default: 'bg-card-bg border border-border',
        gradient: 'gradient-border bg-card-bg',
        glass: 'glass-card',
    };

    const hoverStyles = hover ? 'card-hover cursor-pointer' : '';
    const glowStyles = glow ? 'card-glow' : '';

    return (
        <div
            className={`${baseStyles} ${variants[variant]} ${hoverStyles} ${glowStyles} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

/**
 * GlowingBorder - Animated gradient border wrapper
 */
export const GlowingBorder = ({ children, className = '' }) => (
    <div className={`gradient-border p-4 ${className}`}>
        {children}
    </div>
);

/**
 * FloatingCard - Card with subtle floating animation
 */
export const FloatingCard = ({ children, className = '', delay = 0 }) => (
    <div
        className={`animate-float ${className}`}
        style={{ animationDelay: `${delay}s` }}
    >
        {children}
    </div>
);

export default AnimatedCard;
