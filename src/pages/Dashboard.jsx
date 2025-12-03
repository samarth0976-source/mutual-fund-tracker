import React, { useEffect, useState } from 'react';
import { getTopMutualFunds, enrichDashboardFunds } from '../services/api';
import { ArrowUpRight, ArrowDownRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
    const [funds, setFunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        const loadFunds = async () => {
            setLoading(true);
            const initialList = await getTopMutualFunds(20);
            const enrichedList = await enrichDashboardFunds(initialList);

            const sortedList = enrichedList.sort((a, b) => {
                const retA = parseFloat(a.return6m) || 0;
                const retB = parseFloat(b.return6m) || 0;
                return retB - retA;
            });

            setFunds(sortedList);
            setLoading(false);
        };
        loadFunds();
    }, []);

    const handleViewAll = () => {
        if (user?.isPro) {
            navigate('/market');
        } else {
            navigate('/payment');
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Market Overview</h1>
                    <p className="text-muted">Track top 20 performing mutual funds</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Market Cap', value: '₹12.5T', change: '+2.4%', isPositive: true },
                    { label: 'Top Gainer', value: 'Quant Small Cap', change: '+5.2%', isPositive: true },
                    { label: 'Market Sentiment', value: 'Bullish', change: 'Strong', isPositive: true },
                ].map((stat, index) => (
                    <div key={index} className="bg-surface border border-border p-6 rounded-2xl hover:border-primary/50 transition-all duration-300 group">
                        <p className="text-muted text-sm mb-1">{stat.label}</p>
                        <div className="flex items-end justify-between">
                            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                            <span className={`flex items-center text-sm font-medium ${stat.isPositive ? 'text-primary' : 'text-danger'}`}>
                                {stat.change}
                                {stat.isPositive ? <ArrowUpRight className="w-4 h-4 ml-1" /> : <ArrowDownRight className="w-4 h-4 ml-1" />}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Top 20 Performing Funds</h2>
                    <button
                        onClick={handleViewAll}
                        className="flex items-center gap-2 text-primary text-sm font-medium hover:underline"
                    >
                        {!user?.isPro && <Lock className="w-3 h-3" />}
                        View All
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-muted text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Fund Name</th>
                                <th className="px-6 py-4 font-medium">Rating</th>
                                <th className="px-6 py-4 font-medium">NAV</th>
                                <th className="px-6 py-4 font-medium">1D Return</th>
                                <th className="px-6 py-4 font-medium">6M Return</th>
                                <th className="px-6 py-4 font-medium">1Y Return</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-muted">Loading funds data...</td>
                                </tr>
                            ) : funds.map((fund) => (
                                <tr key={fund.id} onClick={() => navigate(`/fund/${fund.id}`)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-primary">
                                                {fund.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white group-hover:text-primary transition-colors">{fund.name}</p>
                                                <p className="text-xs text-muted">Equity • Growth</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < fund.rating ? 'bg-secondary' : 'bg-border'}`} />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-white">₹{fund.nav || '...'}</td>
                                    <td className="px-6 py-4 font-medium">
                                        {fund.return1d ? (
                                            <span className={parseFloat(fund.return1d) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                {parseFloat(fund.return1d) >= 0 ? '+' : ''}{fund.return1d}%
                                            </span>
                                        ) : '...'}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {fund.return6m ? (
                                            <span className={parseFloat(fund.return6m) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                {parseFloat(fund.return6m) >= 0 ? '+' : ''}{fund.return6m}%
                                            </span>
                                        ) : '...'}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {fund.return1y ? (
                                            <span className={parseFloat(fund.return1y) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                {parseFloat(fund.return1y) >= 0 ? '+' : ''}{fund.return1y}%
                                            </span>
                                        ) : '...'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
