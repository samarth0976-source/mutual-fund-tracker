import React from 'react';
import { LayoutDashboard, PieChart, TrendingUp, BarChart3, Settings, LogOut, Bookmark, Flame, X } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMobile } from '../../contexts/MobileContext';

const Sidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isMobile, isDrawerOpen, closeDrawer } = useMobile();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', exact: true },
        { icon: TrendingUp, label: 'Mutual Funds', path: '/market?tab=mf', checkTab: 'mf' },
        { icon: BarChart3, label: 'ETF', path: '/market?tab=etf', checkTab: 'etf' },
        { icon: Flame, label: 'IPO', path: '/ipo' },
        { icon: Bookmark, label: 'Watchlist', path: '/watchlist' },
        { icon: PieChart, label: 'Portfolio', path: '/portfolio' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
        closeDrawer();
    };

    const isItemActive = (item) => {
        const currentPath = location.pathname;
        const currentSearch = location.search;

        if (item.checkTab) {
            return currentPath === '/market' && currentSearch.includes(`tab=${item.checkTab}`);
        }

        if (item.exact) {
            return currentPath === item.path;
        }

        return currentPath === item.path.split('?')[0];
    };

    const handleNavClick = () => {
        if (isMobile) {
            closeDrawer();
        }
    };

    // Mobile: Show only when drawer is open
    // Desktop: Always visible
    const shouldShow = isMobile ? isDrawerOpen : true;

    if (!shouldShow && isMobile) {
        return null;
    }

    return (
        <>
            {/* Backdrop overlay for mobile */}
            {isMobile && isDrawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={closeDrawer}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col z-50
                transition-transform duration-300 ease-in-out
                ${isMobile ? (isDrawerOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
            `}>
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="FundX" className="w-8 h-8 lg:w-10 lg:h-10 object-contain" />
                        <h1 className="text-lg lg:text-xl font-bold tracking-wider text-white">Fund<span className="text-primary">X</span></h1>
                    </div>

                    {/* Close button for mobile */}
                    {isMobile && (
                        <button
                            onClick={closeDrawer}
                            className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors lg:hidden"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={handleNavClick}
                            className={() =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isItemActive(item)
                                    ? 'bg-primary/10 text-primary shadow-[0_0_10px_rgba(99,102,241,0.1)]'
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
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-white transition-all duration-300"
                    >
                        Contact Us
                    </NavLink>
                    <NavLink
                        to="/terms"
                        onClick={handleNavClick}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted hover:bg-white/5 hover:text-white transition-all duration-300"
                    >
                        Terms & Conditions
                    </NavLink>
                    <NavLink
                        to="/refunds"
                        onClick={handleNavClick}
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
        </>
    );
};

export default Sidebar;
