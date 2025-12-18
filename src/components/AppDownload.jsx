import React, { useState } from 'react';
import { Download, Smartphone, Check, X, Sparkles, Shield, Zap } from 'lucide-react';

const AppDownload = ({ onClose }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadComplete, setDownloadComplete] = useState(false);

    const handleDownload = () => {
        setIsDownloading(true);

        // Trigger download
        const link = document.createElement('a');
        link.href = '/FundX.apk';
        link.download = 'FundX.apk';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Simulate download progress
        setTimeout(() => {
            setIsDownloading(false);
            setDownloadComplete(true);
        }, 2000);
    };

    const features = [
        { icon: <Zap className="w-4 h-4" />, text: 'Lightning Fast Performance' },
        { icon: <Shield className="w-4 h-4" />, text: 'Secure & Private' },
        { icon: <Sparkles className="w-4 h-4" />, text: 'AI-Powered Insights' },
    ];

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-surface via-surface to-primary/5 border border-white/10 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="relative p-6 pb-4">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5 text-muted" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden">
                                <img src="/logo.png" alt="FundX" className="w-12 h-12 object-contain" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <Smartphone className="w-3 h-3 text-black" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">FundX for Android</h2>
                            <p className="text-sm text-muted">Version 1.2.0 • 5.2 MB</p>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="px-6 py-4 border-t border-b border-white/5">
                    <div className="space-y-3">
                        {features.map((feature, index) => (
                            <div key={index} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    {feature.icon}
                                </div>
                                <span className="text-sm text-white/80">{feature.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Download Button */}
                <div className="p-6">
                    {downloadComplete ? (
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                <Check className="w-8 h-8 text-primary" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Download Complete!</h3>
                            <p className="text-sm text-muted mb-4">
                                Open your downloads folder and tap on <strong>FundX.apk</strong> to install.
                            </p>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-400">
                                <strong>Note:</strong> You may need to enable "Install from unknown sources" in your phone settings.
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className={`
                                    w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3
                                    transition-all duration-300 transform
                                    ${isDownloading
                                        ? 'bg-primary/50 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-primary to-secondary hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]'
                                    }
                                    text-black
                                `}
                            >
                                {isDownloading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        <span>Downloading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-5 h-5" />
                                        <span>Download APK</span>
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-muted mt-4">
                                By downloading, you agree to our{' '}
                                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                            </p>
                        </>
                    )}
                </div>

                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            </div>
        </div>
    );
};

export default AppDownload;
