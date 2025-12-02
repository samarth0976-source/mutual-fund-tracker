import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFundDetails } from '../services/api';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FundDetails = () => {
    const { id } = useParams();
    const [fund, setFund] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('1Y');

    useEffect(() => {
        const loadFund = async () => {
            const data = await getFundDetails(id);
            setFund(data);
        };
        loadFund();
    }, [id]);

    // Calculate chart data based on selected period
    const chartData = useMemo(() => {
        if (!fund || !fund.history) return [];

        const history = [...fund.history].reverse();
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

        const data = history.filter(item => new Date(item.date) >= cutoffDate).map(item => ({
            name: new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
            value: parseFloat(item.nav)
        }));
        return data;
    }, [fund, selectedPeriod]);

    if (!fund) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-surface border border-border p-6 rounded-2xl">
                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">{fund.name}</h1>
                                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                                    <span className="px-2 py-1 rounded bg-white/5 border border-border">Equity</span>
                                    <span className="px-2 py-1 rounded bg-white/5 border border-border">Very High Risk</span>
                                    <span className="flex items-center gap-1 text-primary"><TrendingUp className="w-3 h-3" /> High Growth</span>
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-sm text-muted mb-1">Current NAV</p>
                                <h2 className="text-3xl font-bold text-white">₹{fund.nav}</h2>
                                <p className={`text-sm font-medium ${parseFloat(fund.returns[selectedPeriod]) >= 0 ? 'text-primary' : 'text-danger'}`}>
                                    {parseFloat(fund.returns[selectedPeriod]) >= 0 ? '+' : ''}{fund.returns[selectedPeriod]}% ({selectedPeriod})
                                </p>
                            </div>
                        </div>

                        <div className="h-[350px] w-full mt-8">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00e676" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#00e676" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={30} />
                                    <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#00e676' }} labelStyle={{ color: '#999' }} />
                                    <Area type="monotone" dataKey="value" stroke="#00e676" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" animationDuration={500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-between mt-6 border-t border-border pt-6">
                            {['1W', '1M', '1Y', '3Y', '5Y', 'All'].map((period) => (
                                <button key={period} onClick={() => setSelectedPeriod(period)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedPeriod === period ? 'bg-primary text-black shadow-[0_0_10px_rgba(0,230,118,0.4)]' : 'text-muted hover:bg-white/5 hover:text-white'}`}>
                                    {period}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white">Holdings</h3>
                                <p className="text-xs text-muted mt-1">
                                    {fund.isRealData ? (
                                        <span className="text-primary flex items-center gap-1">✅ Real-Time Data from Groww</span>
                                    ) : (
                                        <span className="text-yellow-500 flex items-center gap-1">⚠️ Simulated Data</span>
                                    )}
                                </p>
                            </div>
                            <div className="text-xs text-muted text-right">{fund.holdings.length} Companies</div>
                        </div>
                        <table className="w-full text-left">
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
                                        <td className="px-6 py-4 font-medium text-white">{holding.name}</td>
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
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-surface border border-border p-6 rounded-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Fund Performance</h3>
                        <div className="space-y-4">
                            {Object.entries(fund.returns).map(([period, value]) => (
                                <div key={period} className="flex items-center justify-between">
                                    <span className="text-muted">{period} Return</span>
                                    <span className="text-primary font-mono font-medium">+{value}%</span>
                                </div>
                            ))}
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
                </div>
            </div>
        </div>
    );
};

export default FundDetails;
