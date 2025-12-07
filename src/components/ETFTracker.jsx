import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Search, RefreshCw, BarChart3, AlertCircle } from 'lucide-react';
import { SkeletonList } from './SkeletonLoader';
import { LiveDot } from './PriceDisplay';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Popular Indian ETFs with their NSE symbols
const POPULAR_ETFS = [
    { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', type: 'Index ETF', aum: '34000 Cr', expense: '0.04%' },
    { symbol: 'BANKBEES', name: 'Nippon India ETF Bank BeES', type: 'Banking ETF', aum: '8900 Cr', expense: '0.19%' },
    { symbol: 'JUNIORBEES', name: 'Nippon India ETF Nifty Next 50 Junior BeES', type: 'Index ETF', aum: '3200 Cr', expense: '0.10%' },
    { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', type: 'Gold ETF', aum: '7500 Cr', expense: '0.59%' },
    { symbol: 'ITBEES', name: 'Nippon India ETF Nifty IT', type: 'Sector ETF', aum: '4100 Cr', expense: '0.22%' },
    { symbol: 'SETFNIFTY', name: 'SBI ETF Nifty 50', type: 'Index ETF', aum: '2800 Cr', expense: '0.07%' },
    { symbol: 'SETFNIF50', name: 'SBI Nifty 50 ETF', type: 'Index ETF', aum: '1900 Cr', expense: '0.07%' },
    { symbol: 'CPSE', name: 'Nippon India ETF CPSE', type: 'PSU ETF', aum: '2100 Cr', expense: '0.07%' },
    { symbol: 'PSUBNKBEES', name: 'Nippon India ETF PSU Bank BeES', type: 'Banking ETF', aum: '1800 Cr', expense: '0.19%' },
    { symbol: 'MOM50', name: 'Motilal Oswal Nifty 50 ETF', type: 'Index ETF', aum: '1500 Cr', expense: '0.05%' },
    { symbol: 'SILVERBEES', name: 'Nippon India Silver ETF', type: 'Silver ETF', aum: '2400 Cr', expense: '0.40%' },
    { symbol: 'HDFCNIFTY', name: 'HDFC Nifty 50 ETF', type: 'Index ETF', aum: '1100 Cr', expense: '0.05%' },
    { symbol: 'ICICIBANKP', name: 'ICICI Pru Bank ETF', type: 'Banking ETF', aum: '800 Cr', expense: '0.22%' },
    { symbol: 'KOTAKNIFTY', name: 'Kotak Nifty 50 ETF', type: 'Index ETF', aum: '700 Cr', expense: '0.12%' },
    { symbol: 'PHARMABEES', name: 'Nippon India ETF Nifty Pharma', type: 'Sector ETF', aum: '600 Cr', expense: '0.22%' },
];

const ETFTracker = ({ compact = false }) => {
    const [etfs, setEtfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('name');
    const [error, setError] = useState(null);

    const fetchETFPrices = async () => {
        try {
            setRefreshing(true);
            setError(null);

            // Try fetching from backend first
            const response = await fetch(`${BACKEND_URL}/api/etf-prices`);

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    setEtfs(data);
                    setLastUpdate(new Date().toLocaleTimeString());
                    return;
                }
            }

            // If backend fails, use static ETF list
            // Real prices would need a broker API or subscription service
            setEtfs(POPULAR_ETFS.map(etf => ({
                ...etf,
                ltp: null, // No simulated prices
                change: null,
                perChange: null,
                priceUnavailable: true
            })));
            setLastUpdate(new Date().toLocaleTimeString());
            setError('Live prices require market data subscription. Showing ETF information only.');

        } catch (err) {
            console.error('Error fetching ETF prices:', err);
            setError('Could not load ETF data');
            setEtfs(POPULAR_ETFS.map(etf => ({
                ...etf,
                ltp: null,
                priceUnavailable: true
            })));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchETFPrices();
    }, []);

    const formatPrice = (price) => {
        if (!price || isNaN(price)) return '---';
        return parseFloat(price).toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        });
    };

    const getChangeClass = (change) => {
        if (change === null || change === undefined) return 'text-muted';
        const val = parseFloat(change);
        if (val > 0) return 'text-success';
        if (val < 0) return 'text-danger';
        return 'text-muted';
    };

    const filteredETFs = etfs.filter(etf =>
        !searchQuery ||
        etf.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        etf.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        etf.type?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedETFs = [...filteredETFs].sort((a, b) => {
        if (sortBy === 'name') {
            return (a.name || a.symbol).localeCompare(b.name || b.symbol);
        } else if (sortBy === 'type') {
            return (a.type || '').localeCompare(b.type || '');
        } else if (sortBy === 'aum') {
            const aumA = parseFloat(a.aum?.replace(/[^\d.]/g, '') || 0);
            const aumB = parseFloat(b.aum?.replace(/[^\d.]/g, '') || 0);
            return aumB - aumA;
        }
        return 0;
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
                    onClick={fetchETFPrices}
                    disabled={refreshing}
                    className="p-2 hover:bg-surface rounded-xl transition-all hover:scale-105 disabled:opacity-50"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={`text-muted ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Error/Info Banner */}
            {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-warning/10 border border-warning/20 rounded-xl">
                    <AlertCircle size={16} className="text-warning flex-shrink-0" />
                    <p className="text-xs text-warning">{error}</p>
                </div>
            )}

            {/* Search and Sort (only in full view) */}
            {!compact && (
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search ETFs by name, symbol or type..."
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
                        <option value="type">Sort by Type</option>
                        <option value="aum">Sort by AUM</option>
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
                            key={etf.symbol}
                            className="flex items-center justify-between p-3 rounded-xl bg-surface/50 hover:bg-surface transition-all duration-200 border border-transparent hover:border-border group animate-fade-in opacity-0"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                                        {etf.symbol}
                                    </span>
                                    <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                                        {etf.type}
                                    </span>
                                </div>
                                <p className="text-xs text-muted truncate mt-0.5">
                                    {etf.name}
                                </p>
                                {!compact && (
                                    <div className="flex gap-3 mt-1 text-xs text-muted">
                                        <span>AUM: ₹{etf.aum}</span>
                                        <span>Expense: {etf.expense}</span>
                                    </div>
                                )}
                            </div>

                            <div className="text-right ml-4 flex items-center gap-3">
                                {etf.priceUnavailable ? (
                                    <div className="text-sm text-muted">
                                        ---
                                    </div>
                                ) : (
                                    <div>
                                        <div className="text-sm font-semibold text-white">
                                            ₹{formatPrice(etf.ltp)}
                                        </div>
                                        <div className={`text-xs font-medium ${getChangeClass(etf.perChange)}`}>
                                            {etf.perChange !== null ? (
                                                <>
                                                    {parseFloat(etf.perChange) >= 0 ? '+' : ''}
                                                    {parseFloat(etf.perChange).toFixed(2)}%
                                                </>
                                            ) : '---'}
                                        </div>
                                    </div>
                                )}

                                {etf.perChange !== null && parseFloat(etf.perChange) >= 0 ? (
                                    <TrendingUp size={16} className="text-success" />
                                ) : etf.perChange !== null ? (
                                    <TrendingDown size={16} className="text-danger" />
                                ) : null}
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
                        View All {etfs.length} ETFs →
                    </a>
                </div>
            )}

            {/* Info Banner */}
            <div className="mt-4 p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl border border-primary/10">
                <p className="text-xs text-muted">
                    <span className="text-primary font-semibold">ETFs</span> (Exchange Traded Funds) track indices or sectors.
                    Trade on NSE/BSE like stocks. AUM indicates fund size.
                </p>
            </div>
        </div>
    );
};

export default ETFTracker;
