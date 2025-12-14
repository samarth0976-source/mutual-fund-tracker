import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Key, Calendar, AlertCircle, CreditCard } from 'lucide-react';

const Profile = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    const handleRenew = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/payment/renew`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const orderData = await response.json();

            if (!response.ok) {
                throw new Error(orderData.error || 'Failed to create renewal order');
            }

            // Initialize Cashfree
            const cashfree = new window.Cashfree({
                mode: "production"
            });

            const checkoutOptions = {
                paymentSessionId: orderData.payment_session_id,
                redirectTarget: "_modal",
            };

            cashfree.checkout(checkoutOptions).then((result) => {
                if (result.error) {
                    console.log("Renewal error", result.error);
                    setError("Renewal cancelled or failed. Please try again.");
                    setLoading(false);
                }
                if (result.paymentDetails) {
                    console.log("Renewal successful", result.paymentDetails.paymentMessage);
                    navigate(`/payment/status?order_id=${orderData.order_id}`);
                }
            });

        } catch (err) {
            console.error("Renewal Error:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'DELETE') {
            alert('Please type DELETE to confirm');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/auth/account`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete account');
            }

            // Logout and redirect
            logout();
            navigate('/login');
        } catch (err) {
            console.error('Delete account error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    // Calculate progress percentage based on days remaining
    const getProgressPercentage = () => {
        if (!user?.isPro || !user?.daysRemaining === undefined) return 0;
        const percentage = Math.max(0, Math.min(100, (user.daysRemaining / 30) * 100));
        return percentage;
    };

    // Get color based on days remaining
    const getProgressColor = () => {
        if (!user?.daysRemaining) return 'bg-red-500';
        if (user.daysRemaining > 15) return 'bg-green-500';
        if (user.daysRemaining > 5) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-4 lg:space-y-8">
            <div>
                <h1 className="text-xl lg:text-3xl font-bold text-white mb-1 lg:mb-2">My Profile</h1>
                <p className="text-sm lg:text-base text-muted">Manage your account settings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-surface border border-border rounded-xl lg:rounded-2xl p-4 lg:p-6 text-center">
                        <div className="w-20 h-20 lg:w-32 lg:h-32 mx-auto bg-gradient-to-tr from-primary to-secondary p-[2px] lg:p-[3px] rounded-full mb-3 lg:mb-4">
                            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center overflow-hidden">
                                <User className="w-10 h-10 lg:w-16 lg:h-16 text-white" />
                            </div>
                        </div>
                        <h2 className="text-lg lg:text-xl font-bold text-white mb-1">{user?.username}</h2>
                        <p className={`text-sm mb-4 font-semibold ${user?.isPro ? 'text-yellow-400' : 'text-muted'}`}>
                            {user?.isPro ? 'Pro Member' : 'Free Member'}
                        </p>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${user?.isPro
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : 'bg-white/5 text-muted'
                            }`}>
                            <Shield className="w-3 h-3" />
                            {user?.isPro ? 'Premium Account' : 'Standard Account'}
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="md:col-span-2 space-y-4 lg:space-y-6">
                    {/* Subscription Status */}
                    {user?.isPro && (
                        <div className="bg-surface border border-border rounded-xl lg:rounded-2xl p-4 lg:p-6">
                            <div className="flex items-center justify-between mb-3 lg:mb-4">
                                <h3 className="text-base lg:text-lg font-bold text-white">Subscription</h3>
                                {user?.isGracePeriod && (
                                    <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-medium rounded-full">
                                        Grace Period
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted">Expires On</p>
                                        <p className="text-white font-medium flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-primary" />
                                            {formatDate(user?.subscriptionExpiry)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted">Days Remaining</p>
                                        <p className={`font-bold text-2xl ${user?.daysRemaining > 15 ? 'text-green-400' :
                                            user?.daysRemaining > 5 ? 'text-yellow-400' :
                                                'text-red-400'
                                            }`}>
                                            {user?.daysRemaining !== undefined ? user.daysRemaining : 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted">
                                        <span>Subscription Time Remaining</span>
                                        <span>{user?.daysRemaining || 0} of 30 days</span>
                                    </div>
                                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden relative">
                                        <div
                                            className={`h-full transition-all duration-500 ${getProgressColor()}`}
                                            style={{ width: `${getProgressPercentage()}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Renewal Button for 5 days or less */}
                                {user?.daysRemaining <= 5 && user?.daysRemaining > 0 && (
                                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-yellow-400 mb-1">
                                                    Subscription expiring soon
                                                </p>
                                                <p className="text-xs text-yellow-300/80">
                                                    Renew now to continue enjoying Pro features
                                                </p>
                                            </div>
                                            {error && (
                                                <p className="text-xs text-red-400 mb-2">{error}</p>
                                            )}
                                            <button
                                                onClick={handleRenew}
                                                disabled={loading}
                                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                                            >
                                                {loading ? 'Processing...' : (
                                                    <>
                                                        <CreditCard className="w-4 h-4" />
                                                        Renew Now
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Renewal Banner */}
                                {user?.isGracePeriod && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-red-400 mb-1">
                                                    Your subscription has expired
                                                </p>
                                                <p className="text-xs text-red-300/80 mb-3">
                                                    Renew within 24 hours to keep your Pro features active
                                                </p>
                                                {error && (
                                                    <p className="text-xs text-red-400 mb-2">{error}</p>
                                                )}
                                                <button
                                                    onClick={handleRenew}
                                                    disabled={loading}
                                                    className="w-full sm:w-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {loading ? 'Processing...' : (
                                                        <>
                                                            <CreditCard className="w-4 h-4" />
                                                            Renew Now (₹50/month)
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Personal Information */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Personal Information</h3>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted">Username</label>
                                    <div className="flex items-center gap-3 px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white">
                                        <User className="w-5 h-5 text-muted" />
                                        <span>{user?.username}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted">Email Address</label>
                                    <div className="flex items-center gap-3 px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white">
                                        <Mail className="w-5 h-5 text-muted" />
                                        <span>{user?.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted">Password</label>
                                <div className="flex items-center justify-between px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-5 h-5 text-muted" />
                                        <span className="font-mono tracking-widest">••••••••••••</span>
                                    </div>
                                    <button className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                                        Change
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Statistics */}
                    <div className="bg-surface border border-border rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Account Statistics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-white/5 rounded-xl text-center">
                                <div className="text-2xl font-bold text-primary mb-1">12</div>
                                <div className="text-xs text-muted">Active Funds</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl text-center">
                                <div className="text-2xl font-bold text-secondary mb-1">₹1.2L</div>
                                <div className="text-xs text-muted">Total Invested</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl text-center">
                                <div className="text-2xl font-bold text-green-500 mb-1">+15%</div>
                                <div className="text-xs text-muted">Overall Return</div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-xl text-center">
                                <div className="text-2xl font-bold text-white mb-1">245</div>
                                <div className="text-xs text-muted">Days Active</div>
                            </div>
                        </div>
                    </div>

                    {/* Delete Account Section */}
                    <div className="bg-surface border border-danger/30 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-danger mb-2 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Danger Zone
                        </h3>
                        <p className="text-sm text-muted mb-4">
                            Once you delete your account, there is no going back. Please be certain.
                        </p>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="px-4 py-2 bg-danger/10 text-danger border border-danger hover:bg-danger hover:text-white rounded-lg transition-colors font-medium"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-surface border border-danger/30 rounded-2xl p-8 max-w-md w-full">
                        <h2 className="text-2xl font-bold text-danger mb-4">Delete Account</h2>
                        <p className="text-text mb-4">
                            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </p>
                        <p className="text-sm text-muted mb-4">
                            Please type <span className="font-mono font-bold text-white">DELETE</span> to confirm.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text mb-4 focus:outline-none focus:border-danger"
                            placeholder="Type DELETE"
                        />
                        {error && (
                            <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg text-danger text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmation('');
                                    setError(null);
                                }}
                                className="flex-1 px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-white/5 transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                className="flex-1 px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger/80 transition-colors disabled:opacity-50"
                                disabled={loading || deleteConfirmation !== 'DELETE'}
                            >
                                {loading ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
