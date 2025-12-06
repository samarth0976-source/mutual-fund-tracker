import React from 'react';

/**
 * SkeletonLoader - Shimmer effect loading states
 */
const SkeletonLoader = ({
    type = 'text', // text, title, avatar, card, table-row
    width,
    height,
    className = '',
    count = 1,
    gap = 2
}) => {
    const baseClass = 'skeleton animate-shimmer';

    const types = {
        text: 'h-4 rounded',
        title: 'h-6 rounded',
        avatar: 'w-10 h-10 rounded-full skeleton-circle',
        card: 'h-32 rounded-xl',
        button: 'h-10 w-24 rounded-lg',
    };

    const style = {
        width: width || undefined,
        height: height || undefined,
    };

    if (count === 1) {
        return (
            <div
                className={`${baseClass} ${types[type]} ${className}`}
                style={style}
            />
        );
    }

    return (
        <div className={`flex flex-col gap-${gap}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className={`${baseClass} ${types[type]} ${className}`}
                    style={{
                        ...style,
                        width: type === 'text' ? `${Math.random() * 30 + 70}%` : style.width
                    }}
                />
            ))}
        </div>
    );
};

/**
 * SkeletonCard - Card-shaped skeleton
 */
export const SkeletonCard = ({ className = '' }) => (
    <div className={`bg-card-bg rounded-xl p-4 border border-border ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <SkeletonLoader type="avatar" />
            <div className="flex-1">
                <SkeletonLoader type="text" width="60%" />
                <SkeletonLoader type="text" width="40%" className="mt-2" />
            </div>
        </div>
        <SkeletonLoader type="text" count={2} />
    </div>
);

/**
 * SkeletonTableRow - Table row skeleton
 */
export const SkeletonTableRow = ({ columns = 5 }) => (
    <tr className="border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="px-4 py-4">
                <SkeletonLoader
                    type="text"
                    width={i === 0 ? '80%' : '60%'}
                />
            </td>
        ))}
    </tr>
);

/**
 * SkeletonMarketCard - Market index card skeleton
 */
export const SkeletonMarketCard = () => (
    <div className="bg-card-bg/50 rounded-xl p-4 border border-border">
        <div className="flex justify-between items-center mb-2">
            <SkeletonLoader type="text" width="60px" />
            <SkeletonLoader type="text" width="24px" height="24px" className="rounded" />
        </div>
        <SkeletonLoader type="title" width="100px" className="mb-2" />
        <SkeletonLoader type="text" width="80px" />
    </div>
);

/**
 * SkeletonList - List of skeleton items
 */
export const SkeletonList = ({ count = 5, className = '' }) => (
    <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-card-bg/50 rounded-lg">
                <SkeletonLoader type="avatar" className="w-8 h-8" />
                <div className="flex-1">
                    <SkeletonLoader type="text" width={`${70 + Math.random() * 20}%`} />
                </div>
                <SkeletonLoader type="text" width="60px" />
            </div>
        ))}
    </div>
);

export default SkeletonLoader;
