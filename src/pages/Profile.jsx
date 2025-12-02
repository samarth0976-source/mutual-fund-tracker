import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, Key } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();

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
                        <p className="text-muted text-sm mb-4">Pro Member</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Shield className="w-3 h-3" />
                            Verified Account
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="md:col-span-2 space-y-6">
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
