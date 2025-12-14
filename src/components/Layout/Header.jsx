import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, X, LogOut, CreditCard, Menu } from 'lucide-react';
import { searchFunds } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMobile } from '../../contexts/MobileContext';

const Header = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNews, setShowNews] = useState(false);
    const [news, setNews] = useState([]);
    const [hasUnreadNews, setHasUnreadNews] = useState(false);
    const [showMobileSearch, setShowMobileSearch] = useState(false);
    const searchRef = useRef(null);
    const userMenuRef = useRef(null);
    const newsRef = useRef(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isMobile, toggleDrawer } = useMobile();

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 3) {
                if (!user?.isPro) return;
                setIsSearching(true);
                const data = await searchFunds(query);
                setResults(data);
                setIsSearching(false);
            } else {
                setResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [query, user]);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/news`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setNews(data.news || []);
                const lastSeen = localStorage.getItem('lastNewsCheck') || new Date(0).toISOString();
                const hasNew = data.news.some(item => item.timestamp > lastSeen);
                setHasUnreadNews(hasNew);
            } catch (error) {
                console.error('Failed to fetch news:', error);
            }
        };
        fetchNews();
        const interval = setInterval(fetchNews, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setResults([]);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
            if (newsRef.current && !newsRef.current.contains(event.target)) {
                setShowNews(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleNewsClick = () => {
        setShowNews(!showNews);
        if (!showNews) {
            localStorage.setItem('lastNewsCheck', new Date().toISOString());
            setHasUnreadNews(false);
        }
    };

    return (
        <header className="h-16 lg:h-20 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40 px-4 lg:px-8 flex items-center justify-between ml-0 lg:ml-64">
            {/* Left side: Hamburger + Search */}
            <div className="flex items-center gap-2 lg:gap-3 flex-1">
                {/* Hamburger menu for mobile */}
                {isMobile && (
                    <button
                        onClick={toggleDrawer}
                        className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                )}

                {/* Search */}
                <div className={`relative ${isMobile && !showMobileSearch ? 'hidden' : 'flex-1 max-w-xl'}`} ref={searchRef}>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder={user?.isPro ? "Search mutual funds..." : "Search (Pro Only)..."}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full bg-surface border border-border rounded-xl py-2 lg:py-2.5 pl-10 pr-10 text-text placeholder:text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setResults([]); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {user?.isPro && results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto z-50">
                            {results.map((fund) => (
                                <Link
                                    key={fund.id}
                                    to={`/fund/${fund.id}`}
                                    onClick={() => { setQuery(''); setResults([]); setShowMobileSearch(false); }}
                                    className="block px-4 py-3 hover:bg-white/5 border-b border-border last:border-0 transition-colors"
                                >
                                    <p className="text-sm font-medium text-white">{fund.name}</p>
                                </Link>
                            ))}
                        </div>
                    )}

                    {!user?.isPro && query.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl p-4 text-center shadow-xl z-50">
                            <p className="text-white font-medium mb-2">Search is a Pro Feature</p>
                            <Link
                                to="/payment"
                                onClick={() => setQuery('')}
                                className="inline-block bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Upgrade to Pro
                            </Link>
                        </div>
                    )}

                    {isSearching && user?.isPro && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl p-4 text-center text-muted text-sm">
                            Searching...
                        </div>
                    )}
                </div>

                {/* Search icon for mobile */}
                {isMobile && !showMobileSearch && (
                    <button
                        onClick={() => setShowMobileSearch(true)}
                        className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                )}

                {/* Close search on mobile */}
                {isMobile && showMobileSearch && (
                    <button
                        onClick={() => { setShowMobileSearch(false); setQuery(''); setResults([]); }}
                        className="p-2 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Right side: Actions */}
            <div className="flex items-center gap-3 lg:gap-6">
                {!user?.isPro && !isMobile && (
                    <Link
                        to="/payment"
                        className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-yellow-500/20 transition-all"
                    >
                        <CreditCard className="w-4 h-4" />
                        Upgrade to Pro
                    </Link>
                )}

                {/* News Bell */}
                <div className="relative" ref={newsRef}>
                    <button
                        onClick={handleNewsClick}
                        className="relative text-muted hover:text-white transition-colors p-2"
                    >
                        <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                        {hasUnreadNews && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full shadow-[0_0_8px_rgba(255,23,68,0.6)]"></span>
                        )}
                    </button>

                    {showNews && (
                        <div className="absolute top-full right-0 mt-2 w-80 lg:w-96 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden py-2 max-h-96 overflow-y-auto z-50">
                            <div className="px-4 py-2 border-b border-border">
                                <h3 className="font-semibold text-white">Market News</h3>
                            </div>
                            {news.length > 0 ? (
                                news.map((item) => (
                                    <a
                                        key={item.id}
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block px-4 py-3 hover:bg-white/5 border-b border-border last:border-0 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-white mb-1">{item.title}</p>
                                        <div className="flex items-center justify-between text-xs text-muted">
                                            <span>{item.source}</span>
                                            <span>{new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <div className="px-4 py-3 text-center text-muted text-sm">
                                    No news available
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 lg:gap-3 lg:pl-6 lg:border-l lg:border-border hover:opacity-80 transition-opacity"
                    >
                        <div className="text-right hidden lg:block">
                            <p className="text-sm font-medium text-white">{user?.username || 'Guest'}</p>
                            <p className={`text-xs ${user?.isPro ? 'text-yellow-400 font-bold' : 'text-muted'}`}>
                                {user?.isPro ? 'Pro Account' : 'Free Account'}
                            </p>
                        </div>
                        <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-full p-[2px] ${user?.isPro ? 'bg-gradient-to-tr from-yellow-400 to-yellow-600' : 'bg-gradient-to-tr from-primary to-secondary'}`}>
                            <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                                <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                            </div>
                        </div>
                    </button>

                    {showUserMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden py-1 z-50">
                            <div className="px-4 py-3 border-b border-border">
                                <p className="text-sm font-medium text-white">{user?.username || 'Guest'}</p>
                                <p className="text-xs text-muted truncate">{user?.email}</p>
                            </div>

                            <Link
                                to="/profile"
                                onClick={() => setShowUserMenu(false)}
                                className="w-full text-left px-4 py-2 text-sm text-text hover:bg-white/5 flex items-center gap-2 transition-colors"
                            >
                                <User className="w-4 h-4" />
                                My Profile
                            </Link>

                            {!user?.isPro && (
                                <Link
                                    to="/payment"
                                    onClick={() => setShowUserMenu(false)}
                                    className="w-full text-left px-4 py-2 text-sm text-yellow-500 hover:bg-white/5 flex items-center gap-2 transition-colors font-medium"
                                >
                                    <CreditCard className="w-4 h-4" />
                                    Upgrade to Pro
                                </Link>
                            )}

                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 flex items-center gap-2 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
