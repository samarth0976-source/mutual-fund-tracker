import React, { useEffect, useState } from 'react';
import { getTopMutualFunds } from '../services/api';
import { TrendingUp, Star, Building2, Gem, BarChart3, PiggyBank, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Collection category icons
const CollectionIcon = ({ type }) => {
    const icons = {
        'high-return': <TrendingUp className="w-6 h-6" />,
        'gold-silver': <Gem className="w-6 h-6" />,
        '5-star': <Star className="w-6 h-6" />,
        'large-cap': <Building2 className="w-6 h-6" />,
        'mid-cap': <BarChart3 className="w-6 h-6" />,
        'small-cap': <PiggyBank className="w-6 h-6" />,
    };
    return icons[type] || <TrendingUp className="w-6 h-6" />;
};

// Fund card component
const FundCard = ({ fund, onClick }) => {
    const return3Y = fund.returns?.['1Y'] || fund.return1y || '0.00';
    const isPositive = parseFloat(return3Y) >= 0;

    return (
        <div
            onClick={onClick}
            className="min-w-[200px] bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 transition-all group"
        >
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-lg font-bold text-primary border border-primary/20">
                    {fund.name?.charAt(0) || 'F'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate group-hover:text-primary transition-colors">
                        {fund.name?.replace(/Direct.*$/i, '').trim() || 'Fund Name'}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${isPositive ? 'text-primary' : 'text-red-500'}`}>
                    {isPositive ? '+' : ''}{return3Y}%
                </span>
                <span className="text-xs text-muted">3Y</span>
            </div>
        </div>
    );
};

// Collection card component
const CollectionCard = ({ icon, label, onClick }) => (
    <div
        onClick={onClick}
        className="flex flex-col items-center gap-2 p-4 bg-surface border border-border rounded-xl cursor-pointer hover:border-primary/50 transition-all group"
    >
        <div className="w-14 h-14 bg-gradient-to-br from-teal-500/20 to-teal-500/5 rounded-xl flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <span className="text-sm text-muted group-hover:text-white transition-colors text-center">{label}</span>
    </div>
);

const Dashboard = () => {
    const [funds, setFunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    const collections = [
        { type: 'high-return', label: 'High Return', filter: 'high-return' },
        { type: 'gold-silver', label: 'Gold & Silver', filter: 'gold' },
        { type: '5-star', label: '5 Star Funds', filter: '5-star' },
        { type: 'large-cap', label: 'Large Cap', filter: 'large-cap' },
        { type: 'mid-cap', label: 'Mid Cap', filter: 'mid-cap' },
        { type: 'small-cap', label: 'Small Cap', filter: 'small-cap' },
    ];

    useEffect(() => {
        const loadFunds = async () => {
            setLoading(true);
            const initialList = await getTopMutualFunds(20);
            setFunds(initialList);
            setLoading(false);
        };
        loadFunds();
    }, []);

    return (
        <div className="space-y-8">
            {/* Popular Funds Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Popular Funds</h2>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    {loading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="min-w-[200px] h-[120px] bg-surface border border-border rounded-xl animate-pulse" />
                        ))
                    ) : (
                        funds.slice(0, 4).map((fund) => (
                            <FundCard
                                key={fund.id}
                                fund={fund}
                                onClick={() => navigate(`/fund/${fund.id}`)}
                            />
                        ))
                    )}
                </div>

                <Link to="/market" className="inline-flex items-center gap-1 text-primary text-sm font-medium mt-4 hover:underline">
                    All Mutual Funds <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Collections Section */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Collections</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {collections.map((collection) => (
                        <CollectionCard
                            key={collection.type}
                            icon={<CollectionIcon type={collection.type} />}
                            label={collection.label}
                            onClick={() => navigate(`/market?filter=${collection.filter}`)}
                        />
                    ))}
                </div>
            </div>

            {/* Top Performing Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Top 20 Performing Funds</h2>
                    <Link to="/market" className="text-primary text-sm font-medium hover:underline">View All</Link>
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
                            ) : funds.slice(0, 20).map((fund) => (
                                <tr key={fund.id} onClick={() => navigate(`/fund/${fund.id}`)} className="hover:bg-white/5 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg font-bold text-primary">
                                                {fund.name?.charAt(0)}
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
                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (fund.rating || 4) ? 'bg-secondary' : 'bg-border'}`} />
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
