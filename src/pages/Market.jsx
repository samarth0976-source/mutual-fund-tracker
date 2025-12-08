import React, { useEffect, useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Star, Search, TrendingUp, BarChart3 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ETFTracker from '../components/ETFTracker';
import MarketIndices from '../components/MarketIndices';

const FUNDS_PER_PAGE = 20;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Filter chip component
const FilterChip = ({ label, active, onClick, hasDropdown }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${active
            ? 'bg-primary text-black'
            : 'bg-surface border border-border text-muted hover:text-white hover:border-primary/50'
            }`}
    >
        {label}
        {hasDropdown && <ChevronDown className="w-3 h-3" />}
    </button>
);

// Star rating component
const StarRating = ({ rating }) => (
    <div className="flex items-center gap-1">
        <span className="text-sm text-white">{rating || '--'}</span>
        {rating && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
    </div>
);

// Risk badge component
const RiskBadge = ({ risk }) => {
    const riskColors = {
        'Very High': 'text-red-400',
        'High': 'text-orange-400',
        'Moderate': 'text-yellow-400',
        'Low': 'text-green-400',
    };
    return (
        <span className={`text-sm ${riskColors[risk] || 'text-muted'}`}>
            {risk || 'Very High'}
        </span>
    );
};

const Market = () => {
    const [allFunds, setAllFunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Tab state from URL params
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'mf');

    // Filter states
    const [activeQuickFilters, setActiveQuickFilters] = useState([]);

    const quickFilters = [
        { id: 'index', label: 'Index only' },
        { id: 'flexi-cap', label: 'Flexi Cap' },
        { id: 'sectoral', label: 'Sectoral' },
        { id: '4-star', label: '4+ ★' },
        { id: 'large-cap', label: 'Large Cap' },
        { id: 'mid-cap', label: 'Mid Cap' },
        { id: 'small-cap', label: 'Small Cap' },
    ];

    // Fetch all funds from MFAPI
    useEffect(() => {
        const loadFunds = async () => {
            setLoading(true);
            try {
                // Fetch all funds from MFAPI
                const response = await fetch('https://api.mfapi.in/mf');
                const data = await response.json();

                // Use a Map to deduplicate by scheme code
                const fundMap = new Map();

                data.forEach(fund => {
                    const nameLower = fund.schemeName.toLowerCase();

                    // STRICT filter: Must be Direct Plan AND Growth option
                    const isDirectPlan = nameLower.includes('direct');
                    const isGrowthOption = nameLower.includes('growth');
                    const isDividend = nameLower.includes('dividend') || nameLower.includes('idcw');
                    const isRegular = nameLower.includes('regular plan');

                    // Exclude closed/discontinued/merged funds AND debt/FMP/liquid/specialty funds
                    const excludeKeywords = [
                        // Closed/discontinued
                        'closed', 'merged', 'wef', 'formerly', 'segregated', 'discontinued', 'matured', 'liquidated', 'wound up',
                        // Debt fund categories
                        'fmp', 'fixed maturity', 'interval fund', 'overnight', 'liquid fund',
                        'money market', 'ultra short', 'low duration', 'short duration',
                        'medium duration', 'long duration', 'floater', 'gilt', 'dynamic bond',
                        'credit risk', 'banking psg', 'corporate bond', 'constant maturity',
                        'target maturity', 'capital protection', 'debt fund', 'income fund',
                        // Specialty/niche funds
                        'arbitrage', 'fof', 'fund of fund', 'fund of funds',
                        'retirement', 'children', 'solution', 'savings fund', 'equity savings',
                        // Reduce duplicates
                        'pledge', 'unclaimed'
                    ];
                    const isExcluded = excludeKeywords.some(keyword => nameLower.includes(keyword));

                    // Only include: Direct + Growth, NOT Dividend, NOT Excluded
                    if (isDirectPlan && isGrowthOption && !isDividend && !isRegular && !isExcluded) {
                        // Create normalized name for better deduplication
                        const normalizedName = fund.schemeName
                            .replace(/\s*-?\s*Direct\s*(Plan)?\s*-?\s*/gi, ' ')
                            .replace(/\s*-?\s*Growth\s*(Option)?\s*-?\s*/gi, ' ')
                            .replace(/\s+/g, ' ')
                            .trim()
                            .toLowerCase();

                        // Use normalized name as key to avoid duplicates
                        if (!fundMap.has(normalizedName)) {
                            fundMap.set(normalizedName, {
                                id: fund.schemeCode,
                                name: cleanFundName(fund.schemeName),
                                fullName: fund.schemeName,
                                category: getCategoryFromName(fund.schemeName),
                                rating: getRandomRating(fund.schemeCode),
                                risk: getRiskFromCategory(getCategoryFromName(fund.schemeName)),
                                return1y: null,
                                return3y: null,
                                return5y: null,
                            });
                        }
                    }
                });

                const uniqueFunds = Array.from(fundMap.values());
                console.log(`✅ Loaded ${uniqueFunds.length} active Direct Growth mutual funds (filtered from ${data.length} total schemes)`);
                setAllFunds(uniqueFunds);

                // Check URL params for initial filter
                const filterParam = searchParams.get('filter');
                if (filterParam) {
                    setActiveQuickFilters([filterParam]);
                }
            } catch (error) {
                console.error('Error loading funds:', error);
            }
            setLoading(false);
        };
        loadFunds();
    }, [searchParams]);

    // Fetch returns for visible funds
    useEffect(() => {
        if (allFunds.length === 0) return;

        const fetchReturns = async (schemeCode, index) => {
            try {
                const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
                const data = await response.json();

                if (data && data.data && data.data.length > 0) {
                    const navHistory = data.data;
                    const currentNav = parseFloat(navHistory[0].nav);

                    // Calculate returns
                    const getNavAtDays = (days) => {
                        if (navHistory.length <= days) return parseFloat(navHistory[navHistory.length - 1].nav);
                        return parseFloat(navHistory[Math.min(days, navHistory.length - 1)].nav);
                    };

                    const nav1y = getNavAtDays(252); // ~252 trading days in a year
                    const nav3y = getNavAtDays(756);
                    const nav5y = getNavAtDays(1260);

                    const return1y = ((currentNav - nav1y) / nav1y * 100).toFixed(2);
                    const return3y = ((currentNav - nav3y) / nav3y * 100).toFixed(2);
                    const return5y = ((currentNav - nav5y) / nav5y * 100).toFixed(2);

                    setAllFunds(prev => {
                        const updated = [...prev];
                        const fundIndex = updated.findIndex(f => f.id === schemeCode);
                        if (fundIndex !== -1) {
                            updated[fundIndex] = {
                                ...updated[fundIndex],
                                return1y,
                                return3y,
                                return5y
                            };
                        }
                        return updated;
                    });
                }
            } catch (error) {
                // Silently fail for individual fund errors
            }
        };

        // Fetch returns for first 50 funds progressively
        const startIndex = (currentPage - 1) * FUNDS_PER_PAGE;
        const visibleFunds = filteredFunds.slice(startIndex, startIndex + FUNDS_PER_PAGE);

        visibleFunds.forEach((fund, index) => {
            if (fund.return1y === null) {
                setTimeout(() => {
                    fetchReturns(fund.id, index);
                }, index * 200); // 200ms delay between requests
            }
        });
    }, [currentPage, allFunds.length]);

    // Helper functions
    const cleanFundName = (name) => {
        return name
            .replace(/\s*-?\s*Direct\s*(Plan)?\s*-?\s*/gi, ' ')
            .replace(/\s*-?\s*Growth\s*(Option)?\s*-?\s*/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const getCategoryFromName = (name) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('small cap') || lowerName.includes('smallcap')) return 'Equity Small Cap';
        if (lowerName.includes('mid cap') || lowerName.includes('midcap')) return 'Equity Mid Cap';
        if (lowerName.includes('large cap') || lowerName.includes('largecap')) return 'Equity Large Cap';
        if (lowerName.includes('flexi cap') || lowerName.includes('flexicap')) return 'Equity Flexi Cap';
        if (lowerName.includes('multi cap') || lowerName.includes('multicap')) return 'Equity Multi Cap';
        if (lowerName.includes('elss') || lowerName.includes('tax')) return 'Equity ELSS';
        if (lowerName.includes('gold')) return 'Commodities Gold';
        if (lowerName.includes('silver')) return 'Commodities Silver';
        if (lowerName.includes('index') || lowerName.includes('nifty') || lowerName.includes('sensex')) return 'Index Fund';
        if (lowerName.includes('debt') || lowerName.includes('liquid') || lowerName.includes('money market')) return 'Debt';
        if (lowerName.includes('hybrid') || lowerName.includes('balanced')) return 'Hybrid';
        if (lowerName.includes('sectoral') || lowerName.includes('thematic')) return 'Sectoral';
        return 'Equity';
    };

    const getRandomRating = (schemeCode) => {
        // Use scheme code as seed for consistent rating
        const hash = schemeCode % 10;
        if (hash < 2) return 3;
        if (hash < 5) return 4;
        return 5;
    };

    const getRiskFromCategory = (category) => {
        if (category.includes('Small')) return 'Very High';
        if (category.includes('Mid')) return 'Very High';
        if (category.includes('Sectoral')) return 'Very High';
        if (category.includes('Large')) return 'High';
        if (category.includes('Flexi') || category.includes('Multi')) return 'Very High';
        if (category.includes('Index')) return 'High';
        if (category.includes('Debt') || category.includes('Liquid')) return 'Low';
        if (category.includes('Hybrid')) return 'Moderate';
        return 'Very High';
    };

    // Filter and search logic
    const filteredFunds = useMemo(() => {
        let result = [...allFunds];

        // Search filter
        if (searchQuery) {
            result = result.filter(fund =>
                fund.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                fund.fullName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Quick filters
        activeQuickFilters.forEach(filter => {
            switch (filter) {
                case 'large-cap':
                    result = result.filter(f => f.category.includes('Large'));
                    break;
                case 'mid-cap':
                    result = result.filter(f => f.category.includes('Mid'));
                    break;
                case 'small-cap':
                    result = result.filter(f => f.category.includes('Small'));
                    break;
                case 'flexi-cap':
                    result = result.filter(f => f.category.includes('Flexi'));
                    break;
                case 'index':
                    result = result.filter(f => f.category.includes('Index'));
                    break;
                case 'sectoral':
                    result = result.filter(f => f.category.includes('Sectoral'));
                    break;
                case '4-star':
                    result = result.filter(f => f.rating >= 4);
                    break;
                case 'high-return':
                    result = result.filter(f => parseFloat(f.return1y || 0) > 20);
                    break;
                case 'gold':
                    result = result.filter(f => f.category.includes('Gold') || f.category.includes('Silver'));
                    break;
                case '5-star':
                    result = result.filter(f => f.rating >= 5);
                    break;
            }
        });

        return result;
    }, [allFunds, searchQuery, activeQuickFilters]);

    // Pagination
    const totalPages = Math.ceil(filteredFunds.length / FUNDS_PER_PAGE);
    const displayFunds = filteredFunds.slice(
        (currentPage - 1) * FUNDS_PER_PAGE,
        currentPage * FUNDS_PER_PAGE
    );

    const toggleQuickFilter = (filterId) => {
        setActiveQuickFilters(prev =>
            prev.includes(filterId)
                ? prev.filter(f => f !== filterId)
                : [...prev, filterId]
        );
        setCurrentPage(1);
    };

    const clearAllFilters = () => {
        setActiveQuickFilters([]);
        setSearchQuery('');
        setCurrentPage(1);
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Live Market Banner */}
            <MarketIndices />

            {/* Tab Navigation */}
            <div className="flex items-center gap-1 p-1 bg-surface rounded-xl border border-border w-fit">
                <button
                    onClick={() => setActiveTab('mf')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'mf'
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-muted hover:text-white hover:bg-card-bg'
                        }`}
                >
                    <TrendingUp size={16} />
                    Mutual Funds
                </button>
                <button
                    onClick={() => setActiveTab('etf')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'etf'
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-muted hover:text-white hover:bg-card-bg'
                        }`}
                >
                    <BarChart3 size={16} />
                    ETFs
                </button>
            </div>

            {/* ETF Tab Content */}
            {activeTab === 'etf' && (
                <ETFTracker />
            )}

            {/* Mutual Funds Tab Content */}
            {activeTab === 'mf' && (
                <>
                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2">All Mutual Funds</h1>
                        <p className="text-muted text-sm">Explore {allFunds.length.toLocaleString()} mutual fund schemes</p>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                        <input
                            type="text"
                            placeholder="Search mutual funds..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-xl text-white placeholder-muted focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* Filter Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        <FilterChip label="Categories" hasDropdown />
                        <FilterChip label="Risk" hasDropdown />
                        <FilterChip label="Ratings" hasDropdown />
                        <FilterChip label="Fund House" hasDropdown />

                        <div className="w-px h-6 bg-border mx-2" />

                        {quickFilters.map(filter => (
                            <FilterChip
                                key={filter.id}
                                label={filter.label}
                                active={activeQuickFilters.includes(filter.id)}
                                onClick={() => toggleQuickFilter(filter.id)}
                            />
                        ))}

                        {activeQuickFilters.length > 0 && (
                            <button
                                onClick={clearAllFilters}
                                className="text-sm text-primary hover:underline ml-2"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Results count */}
                    <div className="text-sm text-muted">
                        Fund Name ({filteredFunds.length.toLocaleString()} results)
                    </div>

                    {/* Table */}
                    <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/5 text-muted text-xs uppercase tracking-wider">
                                        <th className="px-4 py-3 font-medium w-[40%]">Fund Name</th>
                                        <th className="px-4 py-3 font-medium">Category</th>
                                        <th className="px-4 py-3 font-medium text-right">1Y ▼</th>
                                        <th className="px-4 py-3 font-medium text-right">3Y</th>
                                        <th className="px-4 py-3 font-medium text-right">5Y</th>
                                        <th className="px-4 py-3 font-medium text-center">Rating</th>
                                        <th className="px-4 py-3 font-medium">Risk</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {loading ? (
                                        [...Array(10)].map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                <td className="px-4 py-4"><div className="h-4 bg-white/10 rounded w-3/4" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-white/10 rounded w-24" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-white/10 rounded w-12 ml-auto" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-white/10 rounded w-12 ml-auto" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-white/10 rounded w-12 ml-auto" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-white/10 rounded w-8 mx-auto" /></td>
                                                <td className="px-4 py-4"><div className="h-4 bg-white/10 rounded w-16" /></td>
                                            </tr>
                                        ))
                                    ) : displayFunds.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-muted">
                                                No funds found matching your criteria
                                            </td>
                                        </tr>
                                    ) : displayFunds.map((fund) => (
                                        <tr
                                            key={fund.id}
                                            onClick={() => navigate(`/fund/${fund.id}`)}
                                            className="hover:bg-white/5 cursor-pointer transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary border border-primary/20 shrink-0">
                                                        {fund.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm text-white truncate max-w-[250px]">
                                                        {fund.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-muted">{fund.category}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {fund.return1y ? (
                                                    <span className={`text-sm ${parseFloat(fund.return1y) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                                        {parseFloat(fund.return1y) >= 0 ? '+' : ''}{fund.return1y}%
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted">--</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {fund.return3y ? (
                                                    <span className={`text-sm ${parseFloat(fund.return3y) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                                        {parseFloat(fund.return3y) >= 0 ? '+' : ''}{fund.return3y}%
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted">--</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {fund.return5y ? (
                                                    <span className={`text-sm ${parseFloat(fund.return5y) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                                        {parseFloat(fund.return5y) >= 0 ? '+' : ''}{fund.return5y}%
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-muted">--</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <StarRating rating={fund.rating} />
                                            </td>
                                            <td className="px-4 py-3">
                                                <RiskBadge risk={fund.risk} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-t border-border">
                                <div className="text-sm text-muted">
                                    Showing {((currentPage - 1) * FUNDS_PER_PAGE) + 1} to {Math.min(currentPage * FUNDS_PER_PAGE, filteredFunds.length)} of {filteredFunds.length.toLocaleString()} funds
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {/* Page numbers */}
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                        let page;
                                        if (totalPages <= 5) {
                                            page = i + 1;
                                        } else if (currentPage <= 3) {
                                            page = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            page = totalPages - 4 + i;
                                        } else {
                                            page = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={page}
                                                onClick={() => goToPage(page)}
                                                className={`px-3 py-1 rounded-lg text-sm ${currentPage === page
                                                    ? 'bg-primary text-black font-medium'
                                                    : 'hover:bg-white/10 text-white'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default Market;



