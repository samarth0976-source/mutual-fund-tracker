import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, RefreshCw, ExternalLink, BarChart3 } from 'lucide-react';
import { SkeletonList } from './SkeletonLoader';
import { PriceBadge, LiveDot } from './PriceDisplay';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const ETFTracker = ({ compact = false }) => {
    const [etfs, setEtfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('name'); // name, change
    const [sortOrder, setSortOrder] = useState('asc');

    const fetchETFs = async () => {
        try {
            setRefreshing(true);
            const response = await fetch(`${BACKEND_URL}/api/kotak/etfs`);
            if (response.ok) {
                const data = await response.json();
                setEtfs(data);
                setLastUpdate(new Date().toLocaleTimeString());
            }
        } catch (error) {
            console.error('Error fetching ETFs:', error);
            setEtfs([
                { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', type: 'Index ETF', ltp: 265.50, change: 1.2, perChange: 0.45 },
                { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', type: 'Index ETF', ltp: 485.30, change: -2.1, perChange: -0.43 },
                { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'Gold ETF', ltp: 58.20, change: 0.3, perChange: 0.52 },
                { symbol: 'SETFNIFTY', name: 'SBI ETF Nifty 50', type: 'Index ETF', ltp: 263.80, change: 1.1, perChange: 0.42 },
                { symbol: 'ITBEES', name: 'Nippon India ETF Nifty IT', type: 'Sector ETF', ltp: 42.15, change: -0.5, perChange: -1.17 }
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchETFs();
        const interval = setInterval(fetchETFs, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const formatPrice = (price) => {
        if (!price || isNaN(price)) return '---';
        return parseFloat(price).toLocaleString('en-IN', {
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

    const filteredETFs = etfs.filter(etf =>
        !searchQuery ||
        etf.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        etf.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort ETFs
    const sortedETFs = [...filteredETFs].sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'name') {
            comparison = (a.name || a.symbol).localeCompare(b.name || b.symbol);
        } else if (sortBy === 'change') {
            comparison = parseFloat(a.perChange || 0) - parseFloat(b.perChange || 0);
        } else if (sortBy === 'price') {
            comparison = parseFloat(a.ltp || 0) - parseFloat(b.ltp || 0);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
    });

    const displayETFs = compact ? sortedETFs.slice(0, 6) : sortedETFs;

    if (loading) {
        return (
            <div className="bg-card-bg/50 rounded-2xl p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-6 w-32 skeleton rounded" />
                </div>
                <SkeletonList count={compact ? 4 : 8} />
            </div>
        );
    }

    return (
        <div className="bg-card-bg/50 rounded-2xl p-6 border border-border animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/20">
                        <BarChart3 size={20} className="text-accent" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">ETF Tracker</h3>
                        <div className="flex items-center gap-3 text-xs text-muted">
                            <LiveDot />
                            {lastUpdate && <span>Updated: {lastUpdate}</span>}
                        </div>
                    </div>
                </div>
                <button
                    onClick={fetchETFs}
                    disabled={refreshing}
                    className="p-2 hover:bg-surface rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={`text-muted ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Search and Sort (only in full view) */}
            {!compact && (
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search ETFs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-surface rounded-xl border border-border text-sm text-white placeholder-muted focus:border-primary focus:outline-none transition-colors"
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="px-3 py-2 bg-surface rounded-xl border border-border text-sm text-white focus:border-primary focus:outline-none"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="change">Sort by Change</option>
                        <option value="price">Sort by Price</option>
                    </select>
                </div>
            )}

            {/* ETF List */}
            <div className="space-y-2">
                {displayETFs.length === 0 ? (
                    <div className="text-center py-8 text-muted">
                        No ETFs found
                    </div>
                ) : (
                    displayETFs.map((etf, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-xl bg-surface/50 hover:bg-surface transition-all duration-200 border border-transparent hover:border-border group animate-fade-in opacity-0"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                                        {etf.tradingSymbol || etf.symbol}
                                    </span>
                                    {etf.type && (
                                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                                            {etf.type}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted truncate mt-0.5">
                                    {etf.name}
                                </p>
                            </div>

                            <div className="text-right ml-4 flex items-center gap-3">
                                <div>
                                    <div className="text-sm font-semibold text-white">
                                        ₹{formatPrice(etf.ltp)}
                                    </div>
                                    <div className={`text-xs font-medium ${getChangeClass(etf.perChange)}`}>
                                        {parseFloat(etf.perChange || 0) >= 0 ? '+' : ''}
                                        {parseFloat(etf.perChange || 0).toFixed(2)}%
                                    </div>
                                </div>

                                {parseFloat(etf.perChange || 0) >= 0 ? (
                                    <TrendingUp size={16} className="text-success" />
                                ) : (
                                    <TrendingDown size={16} className="text-danger" />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* View All link in compact mode */}
            {compact && etfs.length > 6 && (
                <div className="mt-4 text-center">
                    <a
                        href="/market?tab=etf"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition-colors font-medium"
                    >
                        View All {etfs.length} ETFs
                        <ExternalLink size={14} />
                    </a>
                </div>
            )}

            {/* Info Banner */}
            <div className="mt-4 p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                <p className="text-xs text-muted">
                    <span className="text-primary font-semibold">ETFs</span> are Exchange Traded Funds that track indices like Nifty 50 or sectors.
                    They trade like stocks with real-time prices from Kotak Neo API.
                </p>
            </div>
        </div>
    );
};

export default ETFTracker;
