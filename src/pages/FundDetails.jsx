import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFundDetails } from '../services/api';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AddToWatchlistButton from '../components/AddToWatchlistButton';

const FundDetails = () => {
    const { id } = useParams();
    const [fund, setFund] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('1Y');
    const [showAI, setShowAI] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [holdingsKey, setHoldingsKey] = useState(0); // Track to re-trigger stock returns fetch

    const handleRefreshData = async () => {
        try {
            setRefreshing(true);
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
            await fetch(`${BACKEND_URL}/api/cache/clear`, { method: 'POST' });

            const data = await getFundDetails(id);
            setFund(data);
            setHoldingsKey(prev => prev + 1); // Trigger stock returns re-fetch
            setRefreshing(false);
        } catch (error) {
            console.error('Error refreshing data:', error);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const loadFund = async () => {
            try {
                console.log('Loading fund with id:', id);
                const data = await getFundDetails(id);
                console.log('Fund data received:', data ? 'success' : 'null/undefined');
                if (!data) {
                    console.error('getFundDetails returned null for id:', id);
                }
                setFund(data);
            } catch (error) {
                console.error('Error loading fund:', error);
                setFund(null);
            }
        };
        if (id) {
            loadFund();
        }
    }, [id]);

    // Fetch stock returns asynchronously after holdings are loaded
    useEffect(() => {
        if (!fund || !fund.holdings || fund.holdings.length === 0) return;

        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

        const fetchStockReturns = async (stockName, index) => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/stock/returns?name=${encodeURIComponent(stockName)}`);
                if (response.ok) {
                    const returns = await response.json();
                    // Update the specific holding with returns
                    setFund(prevFund => {
                        if (!prevFund || !prevFund.holdings) return prevFund;
                        const updatedHoldings = [...prevFund.holdings];
                        updatedHoldings[index] = {
                            ...updatedHoldings[index],
                            return1m: returns.return1m,
                            return1y: returns.return1y,
                            return3y: returns.return3y
                        };
                        return { ...prevFund, holdings: updatedHoldings };
                    });
                }
            } catch (error) {
                console.error(`Error fetching returns for ${stockName}:`, error);
            }
        };

        // Fetch returns for ALL holdings with 300ms stagger
        fund.holdings.forEach((holding, index) => {
            // Stagger requests to avoid overwhelming the server
            setTimeout(() => {
                fetchStockReturns(holding.name, index);
            }, index * 300); // 300ms delay between each request
        });
    }, [fund?.holdings?.length, holdingsKey]);

    const handleAIAnalysis = async () => {
        setShowAI(true);
        setAiLoading(true);
        setAiError(null);

        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
            const token = localStorage.getItem('token');

            const response = await fetch(`${BACKEND_URL}/api/ai/analyze`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fundName: fund.name,
                    fundData: {
                        nav: fund.nav,
                        oneYearReturn: fund.returns['1Y'],
                        threeYearReturn: fund.returns['3Y'],
                        category: 'Equity',
                        aum: fund.aum || 'N/A'
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'AI analysis failed');
            }

            setAiAnalysis(data.analysis);
        } catch (error) {
            console.error('AI error:', error);
            setAiError(error.message);
        } finally {
            setAiLoading(false);
        }
    };

    // Calculate chart data based on selected period
    const chartData = useMemo(() => {
        if (!fund || !fund.history || fund.history.length === 0) return [];

        const history = [...fund.history]; // Already in chronological order from api.js
        const now = new Date();
        let cutoffDate = new Date();

        switch (selectedPeriod) {
            case '1W': cutoffDate.setDate(now.getDate() - 7); break;
            case '1M': cutoffDate.setMonth(now.getMonth() - 1); break;
            case '1Y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
            case '3Y': cutoffDate.setFullYear(now.getFullYear() - 3); break;
            case '5Y': cutoffDate.setFullYear(now.getFullYear() - 5); break;
            default: cutoffDate = new Date(0);
        }

        // api.js provides dates in YYYY-MM-DD format which Date() handles correctly
        const data = history.filter(item => {
            const itemDate = new Date(item.date);
            return !isNaN(itemDate.getTime()) && itemDate >= cutoffDate;
        }).map(item => {
            const dateObj = new Date(item.date);
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            return {
                name: `${day}-${month}`,
                fullDate: `${day}-${month}-${year}`,
                value: parseFloat(item.nav)
            };
        });
        return data;
    }, [fund, selectedPeriod]);

    if (!fund) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="space-y-4 lg:space-y-8 animate-in fade-in duration-500">
            <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors text-sm">
                <ArrowLeft className="w-4 h-4" /> Back
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
                <div className="lg:col-span-2 space-y-4 lg:space-y-8">
                    <div className="bg-surface border border-border p-4 lg:p-6 rounded-xl lg:rounded-2xl">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 lg:mb-6 gap-3 lg:gap-4">
                            <div>
                                <h1 className="text-xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">{fund.name}</h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                                    <span className="px-2 py-1 rounded bg-white/5 border border-border">Equity</span>
                                    <span className="px-2 py-1 rounded bg-white/5 border border-border">Very High Risk</span>
                                    <span className="flex items-center gap-1 text-primary"><TrendingUp className="w-3 h-3" /> High Growth</span>
                                    <AddToWatchlistButton type="mf" itemId={id} name={fund.name} />
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-xs lg:text-sm text-muted mb-1">Current NAV</p>
                                <h2 className="text-xl lg:text-3xl font-bold text-white">₹{fund.nav}</h2>
                                <p className={`text-sm font-medium ${parseFloat(fund.returns[selectedPeriod]) >= 0 ? 'text-primary' : 'text-danger'}`}>
                                    {parseFloat(fund.returns[selectedPeriod]) >= 0 ? '+' : ''}{fund.returns[selectedPeriod]}% ({selectedPeriod})
                                </p>
                            </div>
                        </div>

                        {/* Chart - Responsive height */}
                        <div className="h-[200px] lg:h-[350px] w-full mt-4 lg:mt-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" tick={false} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={35} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '8px', fontSize: '12px' }}
                                        itemStyle={{ color: '#00e676' }}
                                        labelStyle={{ color: '#999' }}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                        formatter={(value) => [`₹${parseFloat(value).toFixed(2)}`, 'NAV']}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#00e676" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" animationDuration={500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Period Selector - Responsive */}
                        <div className="flex flex-wrap gap-1.5 lg:gap-2 justify-between mt-4 lg:mt-6 border-t border-border pt-4 lg:pt-6">
                            {['1W', '1M', '1Y', '3Y', '5Y', 'All'].map((period) => (
                                <button key={period} onClick={() => setSelectedPeriod(period)} className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${selectedPeriod === period ? 'bg-primary text-black shadow-[0_0_10px_rgba(0,230,118,0.4)]' : 'text-muted hover:bg-white/5 hover:text-white'}`}>
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-xl lg:rounded-2xl overflow-hidden">
                        <div className="p-4 lg:p-6 border-b border-border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                            <div>
                                <h3 className="text-base lg:text-xl font-bold text-white">Holdings</h3>
                                <p className="text-[10px] lg:text-xs text-muted mt-1">
                                    {fund.isRealData && fund.holdings.length > 0 ? (
                                        <span className="text-primary flex items-center gap-1">✅ Live Data</span>
                                    ) : fund.holdings.length > 0 ? (
                                        <span className="text-yellow-500 flex items-center gap-1">⚠️ May not be current</span>
                                    ) : (
                                        <span className="text-gray-400 flex items-center gap-1">📊 Not available</span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 lg:gap-3">
                                <button
                                    onClick={handleRefreshData}
                                    disabled={refreshing}
                                    className="px-3 lg:px-4 py-1.5 lg:py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs lg:text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {refreshing ? '🔄...' : '🔄 Refresh'}
                                </button>
                                {fund.holdings.length > 0 && (
                                    <div className="text-[10px] lg:text-xs text-muted">{fund.holdings.length} stocks</div>
                                )}
                            </div>
                        </div>

                        {fund.holdings.length > 0 ? (
                            <>
                                {/* Mobile Card View */}
                                <div className="lg:hidden divide-y divide-border">
                                    {fund.holdings.map((holding, i) => (
                                        <Link
                                            key={i}
                                            to={`/stock/${encodeURIComponent(holding.name)}`}
                                            className="block p-3 active:bg-white/5"
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <span className="text-xs font-medium text-white flex-1 truncate">{holding.name}</span>
                                                <span className="text-xs font-mono text-primary flex-shrink-0">{holding.allocation}%</span>
                                            </div>
                                            <div className="flex gap-3 text-[10px]">
                                                <div>
                                                    <span className="text-muted">1M: </span>
                                                    {holding.return1m ? (
                                                        <span className={parseFloat(holding.return1m) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {parseFloat(holding.return1m) >= 0 ? '+' : ''}{holding.return1m}%
                                                        </span>
                                                    ) : <span className="text-muted">—</span>}
                                                </div>
                                                <div>
                                                    <span className="text-muted">1Y: </span>
                                                    {holding.return1y ? (
                                                        <span className={parseFloat(holding.return1y) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {parseFloat(holding.return1y) >= 0 ? '+' : ''}{holding.return1y}%
                                                        </span>
                                                    ) : <span className="text-muted">—</span>}
                                                </div>
                                                <div>
                                                    <span className="text-muted">3Y: </span>
                                                    {holding.return3y ? (
                                                        <span className={parseFloat(holding.return3y) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {parseFloat(holding.return3y) >= 0 ? '+' : ''}{holding.return3y}%
                                                        </span>
                                                    ) : <span className="text-muted">—</span>}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <table className="hidden lg:table w-full text-left">
                                    <thead className="bg-white/5 text-muted text-sm">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Stock Name</th>
                                            <th className="px-6 py-4 font-medium">Sector</th>
                                            <th className="px-6 py-4 font-medium text-right">Allocation</th>
                                            <th className="px-6 py-4 font-medium text-right">1M Return</th>
                                            <th className="px-6 py-4 font-medium text-right">1Y Return</th>
                                            <th className="px-6 py-4 font-medium text-right">3Y Return</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {fund.holdings.map((holding, i) => (
                                            <tr key={i} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    <Link to={`/stock/${encodeURIComponent(holding.name)}`} className="hover:text-primary hover:underline transition-colors">
                                                        {holding.name}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-muted">{holding.sector}</td>
                                                <td className="px-6 py-4 text-right font-mono text-white">{holding.allocation}%</td>
                                                <td className="px-6 py-4 text-right font-mono">
                                                    {holding.return1m ? (
                                                        <span className={parseFloat(holding.return1m) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {parseFloat(holding.return1m) >= 0 ? '+' : ''}{holding.return1m}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono">
                                                    {holding.return1y ? (
                                                        <span className={parseFloat(holding.return1y) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {parseFloat(holding.return1y) >= 0 ? '+' : ''}{holding.return1y}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono">
                                                    {holding.return3y ? (
                                                        <span className={parseFloat(holding.return3y) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                            {parseFloat(holding.return3y) >= 0 ? '+' : ''}{holding.return3y}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        ) : (
                            <div className="p-8 lg:p-12 text-center">
                                <div className="text-gray-500 text-3xl lg:text-4xl mb-3 lg:mb-4">📋</div>
                                <h4 className="text-white font-semibold text-base lg:text-lg mb-2">Holdings Unavailable</h4>
                                <p className="text-muted text-xs lg:text-sm max-w-md mx-auto">
                                    Holdings data not available. Try refreshing.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-surface border border-border p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Fund Performance</h3>
                        <div className="space-y-4">
                            {Object.entries(fund.returns).map(([period, value]) => {
                                const numValue = parseFloat(value);
                                const isPositive = numValue >= 0;
                                return (
                                    <div key={period} className="flex items-center justify-between">
                                        <span className="text-muted">{period} Return</span>
                                        <span className={`font-mono font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                            {isPositive ? '+' : ''}{numValue.toFixed(2)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Invest Now</h3>
                        <p className="text-sm text-muted mb-4">Start SIP or invest lump sum in this fund.</p>
                        <button className="w-full py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                            Start SIP
                        </button>
                        <button className="w-full py-3 mt-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">
                            One-time Investment
                        </button>
                    </div>

                    {/* Ask FundX AI Section */}
                    <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            Ask FundX AI
                        </h3>
                        <p className="text-sm text-muted mb-4">
                            Get AI-powered insights and analysis for this fund.
                        </p>
                        <button
                            onClick={handleAIAnalysis}
                            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-blue-500 transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                        >
                            Analyze with AI
                        </button>
                    </div>
                </div>
            </div>

            {/* AI Analysis Modal */}
            {showAI && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-border rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span className="text-3xl">🤖</span>
                                FundX AI Analysis
                            </h2>
                            <button
                                onClick={() => setShowAI(false)}
                                className="text-muted hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mb-4 p-4 bg-white/5 rounded-lg">
                            <p className="text-sm font-semibold text-primary">{fund.name}</p>
                        </div>

                        {aiLoading && (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                                <p className="text-muted">Analyzing fund data with AI...</p>
                            </div>
                        )}

                        {aiError && (
                            <div className="p-4 bg-danger/10 border border-danger rounded-lg text-danger">
                                <p className="font-semibold mb-1">Error</p>
                                <p className="text-sm">{aiError}</p>
                                {aiError.includes('not configured') && (
                                    <p className="text-xs mt-2 text-muted">
                                        AI features require GEMINI_API_KEY to be configured.
                                    </p>
                                )}
                            </div>
                        )}

                        {aiAnalysis && (
                            <div className="prose prose-invert max-w-none">
                                <div className="text-text whitespace-pre-wrap leading-relaxed">
                                    {aiAnalysis}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowAI(false)}
                                className="px-6 py-2 bg-surface border border-border text-text rounded-lg hover:bg-white/5 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FundDetails;
