import React from 'react';
import { LayoutDashboard, PieChart, TrendingUp, BarChart3, Settings, LogOut, Bookmark } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', exact: true },
        { icon: TrendingUp, label: 'Mutual Funds', path: '/market?tab=mf', checkTab: 'mf' },
        { icon: BarChart3, label: 'ETF', path: '/market?tab=etf', checkTab: 'etf' },
        { icon: Bookmark, label: 'Watchlist', path: '/watchlist' },
        { icon: PieChart, label: 'Portfolio', path: '/portfolio' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isItemActive = (item) => {
        const currentPath = location.pathname;
        const currentSearch = location.search;

        // For items with tab check (MF and ETF)
        if (item.checkTab) {
            return currentPath === '/market' && currentSearch.includes(`tab=${item.checkTab}`);
        }

        // For Dashboard - exact match
        if (item.exact) {
            return currentPath === item.path;
        }

        // For other items
        return currentPath === item.path.split('?')[0];
    };

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-50">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.5)]">
                    <TrendingUp className="text-black w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold tracking-wider text-white">FUND<span className="text-primary">X</span></h1>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={() =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isItemActive(item)
                                ? 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(0,230,118,0.1)]'
                                : 'text-muted hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                        <span className="font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="px-4 pb-4 space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider px-4 mb-2">Legal</p>
                <NavLink
                    to="/contact"
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-white transition-all duration-300"
                >
                    Contact Us
                </NavLink>
                <NavLink
                    to="/terms"
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-white transition-all duration-300"
                >
                    Terms & Conditions
                </NavLink>
                <NavLink
                    to="/refunds"
                    className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-white transition-all duration-300"
                >
                    Refunds & Cancellations
                </NavLink>
            </div>

            <div className="p-4 border-t border-border">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted hover:bg-danger/10 hover:text-danger transition-all duration-300"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
