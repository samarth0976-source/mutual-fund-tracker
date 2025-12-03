import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, X, LogOut, CreditCard } from 'lucide-react';
import { searchFunds } from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const searchRef = useRef(null);
    const userMenuRef = useRef(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 3) {
                // Gate Search for Non-Pro Users
                if (!user?.isPro) {
                    return; // Do nothing, or show a tooltip/alert (handled in UI render)
                }

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

    // Close search results and user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setResults([]);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSearchFocus = () => {
        if (!user?.isPro) {
            // Optional: Redirect to payment or show alert
            // For now, we'll just let them type but show a "Pro Required" message in results
        }
    };

    return (
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-40 px-8 flex items-center justify-between ml-64">
            <div className="flex-1 max-w-xl relative" ref={searchRef}>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-5 h-5 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={user?.isPro ? "Search mutual funds..." : "Search (Pro Only)..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={handleSearchFocus}
                        className="w-full bg-surface border border-border rounded-xl py-2.5 pl-10 pr-10 text-text placeholder:text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
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
                {user?.isPro ? (
                    results.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto">
                            {results.map((fund) => (
                                <Link
                                    key={fund.id}
                                    to={`/fund/${fund.id}`}
                                    onClick={() => { setQuery(''); setResults([]); }}
                                    className="block px-4 py-3 hover:bg-white/5 border-b border-border last:border-0 transition-colors"
                                >
                                    <p className="text-sm font-medium text-white">{fund.name}</p>
                                </Link>
                            ))}
                        </div>
                    )
                ) : (
                    query.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl p-4 text-center shadow-xl">
                            <p className="text-white font-medium mb-2">Search is a Pro Feature</p>
                            <Link
                                to="/payment"
                                onClick={() => setQuery('')}
                                className="inline-block bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Upgrade to Pro
                            </Link>
                        </div>
                    )
                )}

                {isSearching && user?.isPro && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl p-4 text-center text-muted text-sm">
                        Searching...
                    </div>
                )}
            </div>

            <div className="flex items-center gap-6">
                {!user?.isPro && (
                    <Link
                        to="/payment"
                        className="hidden md:flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-yellow-500/20 transition-all"
                    >
                        <CreditCard className="w-4 h-4" />
                        Upgrade to Pro
                    </Link>
                )}

                <button className="relative text-muted hover:text-white transition-colors">
                    <Bell className="w-6 h-6" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full shadow-[0_0_8px_rgba(255,23,68,0.6)]"></span>
                </button>

                <div className="relative" ref={userMenuRef}>
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-3 pl-6 border-l border-border hover:opacity-80 transition-opacity"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-white">{user?.username || 'Guest'}</p>
                            <p className={`text-xs ${user?.isPro ? 'text-yellow-400 font-bold' : 'text-muted'}`}>
                                {user?.isPro ? 'Pro Account' : 'Free Account'}
                            </p>
                        </div>
                        <div className={`w-10 h-10 rounded-full p-[2px] ${user?.isPro ? 'bg-gradient-to-tr from-yellow-400 to-yellow-600' : 'bg-gradient-to-tr from-primary to-secondary'}`}>
                            <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                                <User className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </button>

                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden py-1">
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
