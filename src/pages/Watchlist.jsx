import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bookmark, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight,
    TrendingUp, BarChart3, LineChart, ExternalLink
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const Watchlist = () => {
    const navigate = useNavigate();
    const [watchlists, setWatchlists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedLists, setExpandedLists] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchWatchlists();
    }, []);

    // Auto-clear error after 5 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const fetchWatchlists = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Fetching watchlists with token:', token ? 'present' : 'missing');
            const response = await fetch(`${BACKEND_URL}/api/watchlist`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Fetch response status:', response.status);
            const data = await response.json();
            console.log('Fetch response data:', data);

            if (response.ok) {
                setWatchlists(data.watchlists || []);
                // Expand all by default
                const expanded = {};
                data.watchlists?.forEach(w => { expanded[w._id] = true; });
                setExpandedLists(expanded);
            } else {
                setError(data.error || 'Failed to load watchlists');
            }
        } catch (err) {
            console.error('Failed to fetch watchlists:', err);
            setError('Network error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const createWatchlist = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            console.log('Creating watchlist with token:', token ? 'present' : 'missing');

            const response = await fetch(`${BACKEND_URL}/api/watchlist`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName.trim() })
            });

            console.log('Create response status:', response.status);
            const data = await response.json();
            console.log('Create response data:', data);

            if (response.ok) {
                setNewName('');
                setShowCreateModal(false);
                fetchWatchlists();
            } else {
                // Show the actual error from the API
                setError(data.error || `Failed to create watchlist (${response.status})`);
            }
        } catch (err) {
            console.error('Failed to create watchlist:', err);
            setError('Network error: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const renameWatchlist = async (id) => {
        if (!editName.trim()) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${BACKEND_URL}/api/watchlist/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: editName.trim() })
            });
            setEditingId(null);
            fetchWatchlists();
        } catch (error) {
            console.error('Failed to rename watchlist:', error);
        }
    };

    const deleteWatchlist = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${BACKEND_URL}/api/watchlist/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setDeleteConfirm(null);
            fetchWatchlists();
        } catch (error) {
            console.error('Failed to delete watchlist:', error);
        }
    };

    const removeItem = async (watchlistId, itemId) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${BACKEND_URL}/api/watchlist/${watchlistId}/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchWatchlists();
        } catch (error) {
            console.error('Failed to remove item:', error);
        }
    };

    const toggleExpand = (id) => {
        setExpandedLists(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'mf': return <TrendingUp className="w-4 h-4 text-primary" />;
            case 'stock': return <BarChart3 className="w-4 h-4 text-blue-400" />;
            case 'etf': return <LineChart className="w-4 h-4 text-purple-400" />;
            default: return null;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'mf': return 'Mutual Fund';
            case 'stock': return 'Stock';
            case 'etf': return 'ETF';
            default: return type;
        }
    };

    const navigateToItem = (item) => {
        if (item.type === 'mf') {
            navigate(`/fund/${item.itemId}`);
        } else if (item.type === 'stock') {
            navigate(`/stock/${item.itemId}`);
        }
        // ETF navigation can be added later
    };

    if (loading) {
        return (
            <div className="min-h-screen ml-64 p-8 bg-background">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 w-48 bg-surface rounded-lg"></div>
                        <div className="h-40 bg-surface rounded-xl"></div>
                        <div className="h-40 bg-surface rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen ml-64 p-8 bg-background">
            {/* Error Toast */}
            {error && (
                <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg bg-red-500 shadow-lg animate-fade-in">
                    <span className="text-white font-medium">{error}</span>
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Bookmark className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">My Watchlists</h1>
                            <p className="text-muted text-sm">{watchlists.length} watchlist{watchlists.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Create Watchlist
                    </button>
                </div>

                {/* Empty State */}
                {watchlists.length === 0 && (
                    <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                        <Bookmark className="w-16 h-16 text-muted mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">No Watchlists Yet</h2>
                        <p className="text-muted mb-6">Create your first watchlist to start tracking your favorite funds and stocks.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black font-medium rounded-xl hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Watchlist
                        </button>
                    </div>
                )}

                {/* Watchlists */}
                <div className="space-y-4">
                    {watchlists.map(watchlist => (
                        <div key={watchlist._id} className="bg-surface border border-border rounded-2xl overflow-hidden">
                            {/* Watchlist Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border/50">
                                <button
                                    onClick={() => toggleExpand(watchlist._id)}
                                    className="flex items-center gap-3 flex-1"
                                >
                                    {expandedLists[watchlist._id]
                                        ? <ChevronDown className="w-5 h-5 text-muted" />
                                        : <ChevronRight className="w-5 h-5 text-muted" />
                                    }

                                    {editingId === watchlist._id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') renameWatchlist(watchlist._id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            className="px-3 py-1 bg-background border border-primary rounded-lg text-white focus:outline-none"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="text-lg font-semibold text-white">{watchlist.name}</span>
                                    )}

                                    <span className="text-sm text-muted">
                                        ({watchlist.items?.length || 0} item{(watchlist.items?.length || 0) !== 1 ? 's' : ''})
                                    </span>
                                </button>

                                <div className="flex items-center gap-2">
                                    {editingId === watchlist._id ? (
                                        <>
                                            <button
                                                onClick={() => renameWatchlist(watchlist._id)}
                                                className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingId(watchlist._id);
                                                    setEditName(watchlist.name);
                                                }}
                                                className="p-2 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                                title="Rename"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(watchlist._id)}
                                                className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Items */}
                            {expandedLists[watchlist._id] && (
                                <div className="divide-y divide-border/30">
                                    {watchlist.items?.length === 0 ? (
                                        <div className="p-6 text-center text-muted">
                                            <p>No items in this watchlist yet.</p>
                                            <p className="text-sm mt-1">Add stocks or mutual funds from their detail pages.</p>
                                        </div>
                                    ) : (
                                        watchlist.items?.map(item => (
                                            <div
                                                key={item._id}
                                                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                                            >
                                                <button
                                                    onClick={() => navigateToItem(item)}
                                                    className="flex items-center gap-4 flex-1"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                                                        {getTypeIcon(item.type)}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-white font-medium group-hover:text-primary transition-colors">
                                                            {item.name}
                                                        </p>
                                                        <p className="text-xs text-muted">{getTypeLabel(item.type)}</p>
                                                    </div>
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigateToItem(item)}
                                                        className="p-2 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="View Details"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => removeItem(watchlist._id, item._id)}
                                                        className="p-2 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Modal */}
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
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Enter watchlist name..."
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
                                disabled={creating || !newName.trim()}
                                className="flex-1 px-4 py-2 rounded-xl bg-primary text-black font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-surface border border-border rounded-2xl p-6 w-96 shadow-2xl animate-scale-in">
                        <h3 className="text-lg font-semibold text-white mb-2">Delete Watchlist?</h3>
                        <p className="text-muted mb-6">This will permanently delete this watchlist and all its items. This action cannot be undone.</p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 rounded-xl border border-border text-muted hover:text-white hover:border-white/30 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteWatchlist(deleteConfirm)}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Watchlist;
