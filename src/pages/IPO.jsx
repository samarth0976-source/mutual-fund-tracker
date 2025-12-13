import React, { useState, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, Calendar, Clock, Flame,
    ArrowUpRight, ArrowDownRight, RefreshCw, AlertCircle,
    Building2, BarChart3
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const IPO = () => {
    const [activeTab, setActiveTab] = useState('ongoing');
    const [ipoData, setIpoData] = useState({ upcoming: [], ongoing: [], closed: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        fetchIPOData();
    }, []);

    const fetchIPOData = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = `${BACKEND_URL}/api/ipo`;
            console.log('Fetching IPO data from:', url);
            const response = await fetch(url);
            console.log('IPO response status:', response.status, 'content-type:', response.headers.get('content-type'));

            if (!response.ok) throw new Error('Failed to fetch IPO data');

            const text = await response.text();
            // Check if response is actually JSON
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
                throw new Error('Received HTML instead of JSON. Please refresh the page.');
            }

            const data = JSON.parse(text);
            setIpoData(data);
            setLastUpdated(data.lastUpdated);
            if (data.error) setError(data.error);
        } catch (err) {
            console.error('IPO fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'ongoing', label: 'Ongoing', count: ipoData.ongoing?.length || 0, color: 'text-green-400' },
        { id: 'upcoming', label: 'Upcoming', count: ipoData.upcoming?.length || 0, color: 'text-blue-400' },
        { id: 'closed', label: 'Closed', count: ipoData.closed?.length || 0, color: 'text-gray-400' }
    ];

    const renderFireRating = (rating) => {
        if (!rating) return null;
        return (
            <div className="flex items-center gap-0.5" title={`Fire Rating: ${rating}/5`}>
                {[...Array(Math.min(rating, 5))].map((_, i) => (
                    <Flame key={i} className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                ))}
            </div>
        );
    };

    const renderGMPBadge = (gmp, issuePrice) => {
        if (gmp === null || gmp === undefined) return null;
        const isPositive = gmp >= 0;
        const percent = issuePrice ? ((gmp / issuePrice) * 100).toFixed(1) : null;

        return (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>₹{Math.abs(gmp)}</span>
                {percent && <span className="text-xs opacity-70">({isPositive ? '+' : ''}{percent}%)</span>}
            </div>
        );
    };

    const IPOCard = ({ ipo, status }) => {
        const isGainPositive = ipo.gmp >= 0;

        return (
            <div className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/50 transition-all duration-300 group">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                                {ipo.name}
                            </h3>
                            {renderFireRating(ipo.fireRating)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted">
                            <span className={`px-2 py-0.5 rounded text-xs ${ipo.type === 'SME' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                {ipo.type}
                            </span>
                            {ipo.openDate && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {ipo.openDate}{ipo.closeDate ? ` - ${ipo.closeDate}` : ''}
                                </span>
                            )}
                        </div>
                    </div>
                    {renderGMPBadge(ipo.gmp, ipo.issuePrice)}
                </div>

                {/* Price Info Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-background rounded-xl p-3">
                        <p className="text-xs text-muted mb-1">Issue Price</p>
                        <p className="text-lg font-bold text-white">
                            {ipo.issuePrice ? `₹${ipo.issuePrice}` : '-'}
                        </p>
                    </div>
                    <div className="bg-background rounded-xl p-3">
                        <p className="text-xs text-muted mb-1">GMP</p>
                        <p className={`text-lg font-bold ${isGainPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {ipo.gmp !== null ? `${isGainPositive ? '+' : ''}₹${ipo.gmp}` : '-'}
                        </p>
                    </div>
                    <div className="bg-background rounded-xl p-3">
                        <p className="text-xs text-muted mb-1">Est. Listing</p>
                        <p className="text-lg font-bold text-white">
                            {ipo.estListingPrice ? `₹${ipo.estListingPrice}` : '-'}
                        </p>
                    </div>
                </div>

                {/* Expected Gain */}
                {ipo.expectedGainPercent !== null && (
                    <div className={`flex items-center justify-between p-3 rounded-xl ${isGainPositive ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                        <span className="text-sm text-muted">Expected Listing Gain</span>
                        <div className={`flex items-center gap-1 font-semibold ${isGainPositive ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {isGainPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            <span>{isGainPositive ? '+' : ''}{ipo.expectedGainPercent}%</span>
                        </div>
                    </div>
                )}

                {/* Subscription Status for Ongoing */}
                {status === 'ongoing' && ipo.subscription && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted">Subscription</span>
                            <span className="text-white font-medium">{ipo.subscription}x subscribed</span>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(ipo.subscription * 10, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Listing Results for Closed */}
                {status === 'closed' && ipo.listingPrice && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-background rounded-xl p-3">
                            <p className="text-xs text-muted mb-1">Listing Price</p>
                            <p className="text-lg font-bold text-white">₹{ipo.listingPrice}</p>
                        </div>
                        <div className="bg-background rounded-xl p-3">
                            <p className="text-xs text-muted mb-1">Listing Gain</p>
                            <p className={`text-lg font-bold ${ipo.listingGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {ipo.listingGain >= 0 ? '+' : ''}{ipo.listingGain}%
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const currentIPOs = ipoData[activeTab] || [];

    return (
        <div className="min-h-screen ml-64 p-8 bg-background">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">IPO Dashboard</h1>
                            <p className="text-muted text-sm">
                                Live GMP & Grey Market Premium
                                {lastUpdated && (
                                    <span className="ml-2 text-xs">
                                        Updated: {new Date(lastUpdated).toLocaleTimeString()}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={fetchIPOData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl hover:border-primary/50 transition-colors text-muted hover:text-white disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-6 p-1 bg-surface rounded-xl border border-border w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-primary text-black'
                                : 'text-muted hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === tab.id ? 'bg-black/20' : 'bg-white/10'
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-surface border border-border rounded-2xl p-5 animate-pulse">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-24 h-6 bg-background rounded" />
                                    <div className="w-16 h-5 bg-background rounded" />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="h-16 bg-background rounded-xl" />
                                    <div className="h-16 bg-background rounded-xl" />
                                    <div className="h-16 bg-background rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : currentIPOs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Building2 className="w-16 h-16 text-muted mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No {activeTab} IPOs</h3>
                        <p className="text-muted">
                            {activeTab === 'upcoming' && 'No upcoming IPOs announced yet.'}
                            {activeTab === 'ongoing' && 'No IPOs are currently open for subscription.'}
                            {activeTab === 'closed' && 'No recently closed IPOs to show.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {currentIPOs.map((ipo, index) => (
                            <IPOCard key={index} ipo={ipo} status={activeTab} />
                        ))}
                    </div>
                )}

                {/* Legend */}
                <div className="mt-8 p-4 bg-surface/50 rounded-xl border border-border">
                    <h4 className="text-sm font-medium text-white mb-3">What is GMP?</h4>
                    <p className="text-sm text-muted">
                        <strong>GMP (Grey Market Premium)</strong> is the premium at which IPO shares trade in the unofficial grey market before listing.
                        It indicates market sentiment about the IPO. A positive GMP suggests expected listing gains,
                        while a negative GMP indicates potential listing losses.
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                        <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                            <span className="text-muted">= High demand IPO</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-400">
                            <TrendingUp className="w-4 h-4" />
                            <span>= Positive GMP</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-400">
                            <TrendingDown className="w-4 h-4" />
                            <span>= Negative GMP</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IPO;
