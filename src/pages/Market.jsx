import React, { useEffect, useState } from 'react';
import { getAllMutualFunds, enrichDashboardFunds } from '../services/api';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FUNDS_PER_PAGE = 10;

const Market = () => {
    const [allFunds, setAllFunds] = useState([]);
    const [displayFunds, setDisplayFunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();

    useEffect(() => {
        loadFunds();
    }, []);

    const loadFunds = async () => {
        setLoading(true);
        const initialList = await getAllMutualFunds();
        const enrichedList = await enrichDashboardFunds(initialList);

        const sorted = enrichedList.sort((a, b) => {
            const retA = parseFloat(a.return1y) || 0;
            const retB = parseFloat(b.return1y) || 0;
            return sortOrder === 'desc' ? retB - retA : retA - retB;
        });

        setAllFunds(sorted);
        updateDisplayFunds(sorted, 1);
        setLoading(false);
    };

    const updateDisplayFunds = (funds, page) => {
        const startIndex = (page - 1) * FUNDS_PER_PAGE;
        const endIndex = startIndex + FUNDS_PER_PAGE;
        setDisplayFunds(funds.slice(startIndex, endIndex));
    };

    const toggleSortOrder = () => {
        const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
        setSortOrder(newOrder);

        const sorted = [...allFunds].sort((a, b) => {
            const retA = parseFloat(a.return1y) || 0;
            const retB = parseFloat(b.return1y) || 0;
            return newOrder === 'desc' ? retB - retA : retA - retB;
        });

        setAllFunds(sorted);
        updateDisplayFunds(sorted, currentPage);
    };

    const totalPages = Math.ceil(allFunds.length / FUNDS_PER_PAGE);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            updateDisplayFunds(allFunds, page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const Pagination = () => (
        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-t border-border">
            <div className="text-sm text-muted">
                Showing {((currentPage - 1) * FUNDS_PER_PAGE) + 1} to {Math.min(currentPage * FUNDS_PER_PAGE, allFunds.length)} of {allFunds.length} funds
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                        return (
                            <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                    ? 'bg-primary text-black'
                                    : 'hover:bg-white/10 text-white'
                                    }`}
                            >
                                {page}
                            </button>
                        );
                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                        return <span key={page} className="text-muted">...</span>;
                    }
                    return null;
                }).filter(Boolean)}

                <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">All Mutual Funds</h1>
                    <p className="text-muted">Explore all available mutual funds ({allFunds.length} total)</p>
                </div>
                <button onClick={toggleSortOrder} className="flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2 text-sm hover:border-primary transition-colors">
                    <ArrowUpDown className="w-4 h-4" />
                    <span>1Y Return: {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}</span>
                </button>
            </div>

            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                {!loading && allFunds.length > FUNDS_PER_PAGE && <Pagination />}

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-muted text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Fund Name</th>
                                <th className="px-6 py-4 font-medium">Rating</th>
                                <th className="px-6 py-4 font-medium">NAV</th>
                                <th className="px-6 py-4 font-medium">1Y Return</th>
                                <th className="px-6 py-4 font-medium">3Y Return</th>
                                <th className="px-6 py-4 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-muted">Loading funds data...</td>
                                </tr>
                            ) : displayFunds.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-muted">No funds available</td>
                                </tr>
                            ) : displayFunds.map((fund) => (
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
                                        {fund.return1y ? (
                                            <span className={parseFloat(fund.return1y) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                {parseFloat(fund.return1y) >= 0 ? '+' : ''}{fund.return1y}%
                                            </span>
                                        ) : '...'}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {fund.return3y ? (
                                            <span className={parseFloat(fund.return3y) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                {parseFloat(fund.return3y) >= 0 ? '+' : ''}{fund.return3y}%
                                            </span>
                                        ) : '...'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium text-sm">
                                            Details
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && allFunds.length > FUNDS_PER_PAGE && <Pagination />}
            </div>
        </div>
    );
};

export default Market;
