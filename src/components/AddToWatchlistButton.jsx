import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Plus, Check, ChevronDown, X } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const AddToWatchlistButton = ({ type, itemId, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [watchlists, setWatchlists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newWatchlistName, setNewWatchlistName] = useState('');
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState(null);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchWatchlists = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${BACKEND_URL}/api/watchlist`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setWatchlists(data.watchlists || []);
            }
        } catch (error) {
            console.error('Failed to fetch watchlists:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        if (!isOpen) {
            fetchWatchlists();
        }
        setIsOpen(!isOpen);
    };

    const isInWatchlist = (watchlist) => {
        return watchlist.items?.some(item => item.itemId === itemId && item.type === type);
    };

    const toggleItemInWatchlist = async (watchlist) => {
        const token = localStorage.getItem('token');
        const inList = isInWatchlist(watchlist);

        try {
            if (inList) {
                // Remove from watchlist
                const itemEntry = watchlist.items.find(item => item.itemId === itemId && item.type === type);
                await fetch(`${BACKEND_URL}/api/watchlist/${watchlist._id}/items/${itemEntry._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                showToast(`Removed from "${watchlist.name}"`);
            } else {
                // Add to watchlist
                await fetch(`${BACKEND_URL}/api/watchlist/${watchlist._id}/items`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ type, itemId, name })
                });
                showToast(`Added to "${watchlist.name}"`);
            }
            fetchWatchlists();
        } catch (error) {
            console.error('Failed to update watchlist:', error);
            showToast('Failed to update watchlist', true);
        }
    };

    const createWatchlist = async () => {
        if (!newWatchlistName.trim()) return;

        setCreating(true);
        try {
            const token = localStorage.getItem('token');
            console.log('Creating watchlist with token:', token ? 'present' : 'missing');

            const response = await fetch(`${BACKEND_URL}/api/watchlist`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newWatchlistName.trim() })
            });

            console.log('Create response status:', response.status);
            const data = await response.json();
            console.log('Create response data:', data);

            if (response.ok) {
                setNewWatchlistName('');
                setShowCreateModal(false);
                fetchWatchlists();
                showToast(`Created "${newWatchlistName.trim()}"`);
            } else {
                // Show the actual error from the API
                showToast(data.error || `Failed to create (${response.status})`, true);
            }
        } catch (error) {
            console.error('Failed to create watchlist:', error);
            showToast('Network error: ' + error.message, true);
        } finally {
            setCreating(false);
        }
    };

    const showToast = (message, isError = false) => {
        setToast({ message, isError });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${toast.isError ? 'bg-red-500' : 'bg-primary'
                    }`}>
                    <span className="text-black font-medium">{toast.message}</span>
                </div>
            )}

            {/* Main Button */}
            <button
                onClick={handleToggle}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border hover:border-primary/50 transition-all duration-300 group"
            >
                <Bookmark className={`w-5 h-5 ${watchlists.some(w => isInWatchlist(w)) ? 'fill-primary text-primary' : 'text-muted group-hover:text-primary'}`} />
                <span className="text-sm font-medium text-white">Watchlist</span>
                <ChevronDown className={`w-4 h-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-border">
                        <p className="text-xs text-muted uppercase tracking-wider">Add to Watchlist</p>
                    </div>

                    {loading ? (
                        <div className="p-4 text-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        </div>
                    ) : (
                        <>
                            <div className="max-h-48 overflow-y-auto">
                                {watchlists.length === 0 ? (
                                    <p className="p-4 text-sm text-muted text-center">No watchlists yet</p>
                                ) : (
                                    watchlists.map(watchlist => (
                                        <button
                                            key={watchlist._id}
                                            onClick={() => toggleItemInWatchlist(watchlist)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isInWatchlist(watchlist)
                                                ? 'bg-primary border-primary'
                                                : 'border-muted'
                                                }`}>
                                                {isInWatchlist(watchlist) && <Check className="w-3 h-3 text-black" />}
                                            </div>
                                            <span className="text-sm text-white flex-1 text-left">{watchlist.name}</span>
                                            <span className="text-xs text-muted">{watchlist.items?.length || 0}</span>
                                        </button>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="w-full flex items-center gap-2 px-4 py-3 border-t border-border hover:bg-primary/10 transition-colors text-primary"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm font-medium">Create New Watchlist</span>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Create Watchlist Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface border border-border rounded-2xl p-6 w-96 shadow-2xl animate-scale-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Create Watchlist</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <input
                            type="text"
                            value={newWatchlistName}
                            onChange={(e) => setNewWatchlistName(e.target.value)}
                            placeholder="Watchlist name..."
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary outline-none text-white placeholder:text-muted mb-4"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && createWatchlist()}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 rounded-xl border border-border text-muted hover:text-white hover:border-white/30 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createWatchlist}
                                disabled={creating || !newWatchlistName.trim()}
                                className="flex-1 px-4 py-2 rounded-xl bg-primary text-black font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddToWatchlistButton;
