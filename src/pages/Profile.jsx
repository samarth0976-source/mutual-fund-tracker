import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Key, Calendar, AlertCircle, CreditCard } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    // Calculate progress percentage
    const getProgressPercentage = () => {
        if (!user?.isPro || !user?.subscriptionExpiry) return 0;
        const now = new Date();
        const expiry = new Date(user.subscriptionExpiry);
        const total = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
        const remaining = expiry - now;
        const percentage = Math.max(0, Math.min(100, (remaining / total) * 100));
        return percentage;
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
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                <p className="text-muted">Manage your account settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-surface border border-border rounded-2xl p-6 text-center">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-tr from-primary to-secondary p-[3px] rounded-full mb-4">
                            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center overflow-hidden">
                                <User className="w-16 h-16 text-white" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">{user?.username}</h2>
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
                <div className="md:col-span-2 space-y-6">
                    {/* Subscription Status */}
                    {user?.isPro && (
                        <div className="bg-surface border border-border rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Subscription Status</h3>
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
                                        <p className={`font-bold text-2xl ${user?.daysRemaining > 7 ? 'text-green-400' :
                                                user?.daysRemaining > 0 ? 'text-yellow-400' :
                                                    'text-red-400'
                                            }`}>
                                            {user?.daysRemaining || 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-muted">
                                        <span>Subscription Progress</span>
                                        <span>{Math.round(getProgressPercentage())}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-500 ${getProgressPercentage() > 50 ? 'bg-green-500' :
                                                    getProgressPercentage() > 20 ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                                }`}
                                            style={{ width: `${getProgressPercentage()}%` }}
                                        />
                                    </div>
                                </div>

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
                </div>
            </div>
        </div>
    );
};

export default Profile;
