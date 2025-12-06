import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * PriceDisplay - Animated price component with flash effects
 */
const PriceDisplay = ({
    value,
    prefix = '₹',
    suffix = '',
    change = null,
    showTrend = true,
    size = 'md', // sm, md, lg, xl
    animate = true
}) => {
    const [flash, setFlash] = useState(null);
    const prevValue = useRef(value);

    useEffect(() => {
        if (animate && prevValue.current !== value && value !== null) {
            const newVal = parseFloat(value);
            const oldVal = parseFloat(prevValue.current);

            if (newVal > oldVal) {
                setFlash('green');
            } else if (newVal < oldVal) {
                setFlash('red');
            }

            const timer = setTimeout(() => setFlash(null), 500);
            prevValue.current = value;
            return () => clearTimeout(timer);
        }
    }, [value, animate]);

    const formatNumber = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '---';
        return parseFloat(num).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    };

    const sizes = {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-2xl',
        xl: 'text-4xl font-bold'
    };

    const getChangeColor = (val) => {
        const num = parseFloat(val);
        if (num > 0) return 'text-success';
        if (num < 0) return 'text-danger';
        return 'text-muted';
    };

    const getTrendIcon = (val) => {
        const num = parseFloat(val);
        if (num > 0) return <TrendingUp size={16} className="text-success" />;
        if (num < 0) return <TrendingDown size={16} className="text-danger" />;
        return <Minus size={16} className="text-muted" />;
    };

    const flashClass = flash === 'green' ? 'flash-green' : flash === 'red' ? 'flash-red' : '';

    return (
        <div className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 ${flashClass}`}>
            <span className={`font-semibold text-white ${sizes[size]}`}>
                {prefix}{formatNumber(value)}{suffix}
            </span>

            {change !== null && (
                <span className={`flex items-center gap-1 text-sm font-medium ${getChangeColor(change)}`}>
                    {showTrend && getTrendIcon(change)}
                    <span>
                        {parseFloat(change) >= 0 ? '+' : ''}
                        {formatNumber(change)}%
                    </span>
                </span>
            )}
        </div>
    );
};

/**
 * PriceBadge - Compact price change badge
 */
export const PriceBadge = ({ value, size = 'sm' }) => {
    const num = parseFloat(value);
    const isPositive = num >= 0;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5'
    };

    return (
        <span className={`
      inline-flex items-center gap-1 rounded-full font-semibold
      ${sizeClasses[size]}
      ${isPositive ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}
    `}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}{parseFloat(value).toFixed(2)}%
        </span>
    );
};

/**
 * LiveDot - Animated live indicator
 */
export const LiveDot = ({ label = 'LIVE' }) => (
    <div className="live-indicator">
        <div className="live-dot" />
        <span className="text-xs font-medium text-success">{label}</span>
    </div>
);

export default PriceDisplay;
