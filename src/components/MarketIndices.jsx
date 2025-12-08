import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';
import { SkeletonMarketCard } from './SkeletonLoader';
import { LiveDot } from './PriceDisplay';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const MarketIndices = () => {
    const [indices, setIndices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchIndices = async () => {
        try {
            setRefreshing(true);
            const response = await fetch(`${BACKEND_URL}/api/kotak/indices`);
            if (response.ok) {
                const data = await response.json();
                // Ensure we have Mid Cap and Financial Nifty even if API doesn't return them
                const hasNiftyMid = data.some(d => d.displayName?.includes('MID') || d.symbol?.includes('MID'));
                const hasNiftyFin = data.some(d => d.displayName?.includes('FIN') || d.symbol?.includes('FIN'));

                let finalData = data;
                if (!hasNiftyMid) {
                    finalData.push({ symbol: 'NIFTY MID 50', displayName: 'NIFTY MIDCAP 50', ltp: 0, change: 0, perChange: 0, isError: true });
                }
                if (!hasNiftyFin) {
                    finalData.push({ symbol: 'NIFTY FIN SERVICE', displayName: 'NIFTY FIN SERVICES', ltp: 0, change: 0, perChange: 0, isError: true });
                }

                setIndices(finalData.slice(0, 6)); // Show max 6 indices
                setLastUpdate(new Date().toLocaleTimeString());
            } else {
                throw new Error('API response not ok');
            }
        } catch (error) {
            console.error('Error fetching indices:', error);
            setIndices([
                { symbol: 'Nifty 50', displayName: 'NIFTY 50', ltp: 0, change: 0, perChange: 0, isError: true },
                { symbol: 'Nifty Bank', displayName: 'BANK NIFTY', ltp: 0, change: 0, perChange: 0, isError: true },
                { symbol: 'NIFTY IT', displayName: 'NIFTY IT', ltp: 0, change: 0, perChange: 0, isError: true },
                { symbol: 'NIFTY MID 50', displayName: 'NIFTY MIDCAP 50', ltp: 0, change: 0, perChange: 0, isError: true },
                { symbol: 'NIFTY FIN SERVICE', displayName: 'NIFTY FIN SERVICES', ltp: 0, change: 0, perChange: 0, isError: true },
                { symbol: 'SENSEX', displayName: 'SENSEX', ltp: 0, change: 0, perChange: 0, isError: true }
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchIndices();
        const interval = setInterval(fetchIndices, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num) => {
        if (!num || isNaN(num)) return '---';
        return parseFloat(num).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    };

    const getChangeClass = (change) => {
        const val = parseFloat(change);
        if (val > 0) return 'text-success';
        if (val < 0) return 'text-danger';
        return 'text-muted';
    };

    const getGradientClass = (change) => {
        const val = parseFloat(change);
        if (val > 0) return 'from-success/20 to-success/5 border-success/30';
        if (val < 0) return 'from-danger/20 to-danger/5 border-danger/30';
        return 'from-muted/20 to-muted/5 border-muted/30';
    };

    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-6 w-32 skeleton rounded" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonMarketCard key={i} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20">
                        <Activity size={20} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Live Market</h2>
                        <div className="flex items-center gap-3 text-xs text-muted">
                            <LiveDot />
                            {lastUpdate && <span>Updated: {lastUpdate}</span>}
                        </div>
                    </div>
                </div>
                <button
                    onClick={fetchIndices}
                    disabled={refreshing}
                    className="p-2 hover:bg-card-bg rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={`text-muted ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Index Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {indices.map((index, i) => (
                    <div
                        key={i}
                        className={`
              rounded-xl p-4 border backdrop-blur-sm 
              bg-gradient-to-br ${getGradientClass(index.change)}
              transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
              animate-fade-in opacity-0
            `}
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-white/90">
                                {index.displayName || index.symbol}
                            </span>
                            <div className={`p-1.5 rounded-lg ${parseFloat(index.change) >= 0 ? 'bg-success/20' : 'bg-danger/20'}`}>
                                {parseFloat(index.change) >= 0 ? (
                                    <TrendingUp size={14} className="text-success" />
                                ) : (
                                    <TrendingDown size={14} className="text-danger" />
                                )}
                            </div>
                        </div>

                        <div className="text-2xl font-bold text-white mb-2">
                            {index.isError ? '---' : formatNumber(index.ltp)}
                        </div>

                        <div className={`text-sm font-semibold ${getChangeClass(index.change)}`}>
                            {index.isError ? '---' : (
                                <>
                                    {parseFloat(index.change) >= 0 ? '+' : ''}
                                    {formatNumber(index.change)}
                                    <span className="ml-1 opacity-80">
                                        ({parseFloat(index.perChange) >= 0 ? '+' : ''}{parseFloat(index.perChange).toFixed(2)}%)
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketIndices;
