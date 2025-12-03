import React from 'react';
import { Moon, Sun, Trash2, Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Settings = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-text mb-8">Settings</h1>

            <div className="space-y-6">
                {/* Theme Settings */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        Appearance
                    </h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-text font-medium">Theme</p>
                            <p className="text-sm text-muted">Switch between light and dark mode</p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-gray-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-8 w-8 transform rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-11' : 'translate-x-1'
                                    }`}
                            >
                                {theme === 'dark' ? (
                                    <Moon className="w-5 h-5 m-1.5 text-primary" />
                                ) : (
                                    <Sun className="w-5 h-5 m-1.5 text-yellow-500" />
                                )}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Privacy Settings */}
                <div className="bg-surface border border-border rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-text mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Privacy & Security
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-text font-medium mb-2">Data Privacy</p>
                            <p className="text-sm text-muted">Your portfolio data is stored locally and encrypted.</p>
                        </div>
                    </div>
                </div>

                {/* Account Actions */}
                <div className="bg-surface border border-danger/20 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-danger mb-4 flex items-center gap-2">
                        <Trash2 className="w-5 h-5" />
                        Danger Zone
                    </h2>
                    <div>
                        <p className="text-text font-medium mb-2">Delete Account</p>
                        <p className="text-sm text-muted mb-4">
                            To delete your account, please go to your Profile page.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
