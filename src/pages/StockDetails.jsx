import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Activity, DollarSign, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StockDetails = () => {
    const { name } = useParams();
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('1Y');

    useEffect(() => {
        const fetchStockDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await fetch(`${API_URL}/api/stock/details?name=${encodeURIComponent(name)}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch stock details');
                }

                const data = await response.json();
                setStockData(data);
            } catch (err) {
                console.error("Error fetching stock details:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (name) {
            fetchStockDetails();
        }
    }, [name]);

    const chartData = useMemo(() => {
        if (!stockData || !stockData.history) return [];

        const history = [...stockData.history];
        const now = new Date();
        let cutoffDate = new Date();

        switch (timeRange) {
            case '1W': cutoffDate.setDate(now.getDate() - 7); break;
            case '1M': cutoffDate.setMonth(now.getMonth() - 1); break;
            case '3M': cutoffDate.setMonth(now.getMonth() - 3); break;
            case '6M': cutoffDate.setMonth(now.getMonth() - 6); break;
            case '1Y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
            default: cutoffDate = new Date(0);
        }

        // Filter and format data
        return history
            .filter(item => new Date(item.time * 1000) >= cutoffDate)
            .map(item => ({
                date: new Date(item.time * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                fullDate: new Date(item.time * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                price: item.close
            }));
    }, [stockData, timeRange]);

    const calculateChange = () => {
        if (!chartData || chartData.length < 2) return { value: 0, percent: 0 };
        const startPrice = chartData[0].price;
        const endPrice = chartData[chartData.length - 1].price;
        const change = endPrice - startPrice;
        const percent = (change / startPrice) * 100;
        return { value: change.toFixed(2), percent: percent.toFixed(2) };
    };

    const change = calculateChange();
    const isPositive = parseFloat(change.value) >= 0;

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <div className="text-danger text-xl font-bold mb-2">Error Loading Stock Data</div>
            <p className="text-muted mb-4">{error}</p>
            <Link to="/" className="text-primary hover:underline">Return to Dashboard</Link>
        </div>
    );

    const navigate = useNavigate();

    if (!stockData) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface border border-border p-6 rounded-2xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-1">{name}</h1>
                                <div className="flex items-center gap-2 text-sm text-muted">
                                    <span className="px-2 py-0.5 rounded bg-white/5 border border-border">{stockData.exchange}:{stockData.symbol}</span>
                                    <span>{stockData.description}</span>
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <h2 className="text-4xl font-bold text-white">₹{stockData.currentPrice}</h2>
                                <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? 'text-primary' : 'text-danger'}`}>
                                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                    <span>{isPositive ? '+' : ''}{change.value} ({isPositive ? '+' : ''}{change.percent}%)</span>
                                    <span className="text-muted font-normal">Past {timeRange}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isPositive ? "#00e676" : "#ff5252"} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={isPositive ? "#00e676" : "#ff5252"} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#666"
                                        tick={{ fill: '#666', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        minTickGap={40}
                                    />
                                    <YAxis
                                        stroke="#666"
                                        tick={{ fill: '#666', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={['auto', 'auto']}
                                        tickFormatter={(val) => `₹${val}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '8px' }}
                                        itemStyle={{ color: isPositive ? '#00e676' : '#ff5252' }}
                                        labelStyle={{ color: '#999' }}
                                        labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="price"
                                        stroke={isPositive ? "#00e676" : "#ff5252"}
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#colorPrice)"
                                        animationDuration={500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-border">
                            {['1W', '1M', '3M', '6M', '1Y'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${timeRange === range ? 'bg-primary text-black shadow-[0_0_10px_rgba(0,230,118,0.4)]' : 'text-muted hover:bg-white/5 hover:text-white'}`}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-6">
                    <div className="bg-surface border border-border p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            Market Stats
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-muted text-sm">Open</span>
                                <span className="text-white font-mono">₹{chartData[chartData.length - 1]?.price || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-muted text-sm">High (1Y)</span>
                                <span className="text-white font-mono">₹{Math.max(...(stockData.history?.map(h => h.high) || [0]))}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-muted text-sm">Low (1Y)</span>
                                <span className="text-white font-mono">₹{Math.min(...(stockData.history?.map(h => h.low) || [0]))}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-muted text-sm">Exchange</span>
                                <span className="text-white">{stockData.exchange}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-muted text-sm">Currency</span>
                                <span className="text-white">{stockData.currency}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">About {name}</h3>
                        <p className="text-sm text-muted mb-4">
                            {stockData.description} is a publicly traded company listed on the {stockData.exchange}.
                        </p>
                        <button className="w-full py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">
                            Add to Watchlist
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockDetails;
