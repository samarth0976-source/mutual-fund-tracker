import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Bell, Mail, Globe } from 'lucide-react';

const Privacy = () => {
    const lastUpdated = "December 15, 2024";

    const sections = [
        {
            icon: <Database className="w-5 h-5" />,
            title: "Information We Collect",
            content: [
                "Account Information: Email address, username, and password (encrypted) when you create an account.",
                "Usage Data: How you interact with our app, including pages visited, features used, and preferences.",
                "Device Information: Device type, operating system, and browser type for optimization purposes.",
                "Financial Preferences: Watchlists, portfolio data, and investment preferences you choose to save."
            ]
        },
        {
            icon: <Eye className="w-5 h-5" />,
            title: "How We Use Your Information",
            content: [
                "To provide and maintain our mutual fund tracking services.",
                "To personalize your experience with relevant fund recommendations.",
                "To send you important updates about your watchlists and market alerts (if enabled).",
                "To improve our app based on usage patterns and feedback.",
                "To provide AI-powered investment insights and analysis."
            ]
        },
        {
            icon: <Shield className="w-5 h-5" />,
            title: "Data Security",
            content: [
                "All passwords are encrypted using industry-standard bcrypt hashing.",
                "Data transmission is secured with HTTPS/TLS encryption.",
                "We do not store any payment information - all payments are processed securely by Cashfree.",
                "Regular security audits are conducted to protect your data.",
                "Access to user data is strictly limited to authorized personnel."
            ]
        },
        {
            icon: <Globe className="w-5 h-5" />,
            title: "Third-Party Services",
            content: [
                "Groww & MFAPI: For fetching mutual fund data and NAV information.",
                "Cashfree: For secure payment processing (Pro subscriptions).",
                "Google Gemini AI: For AI-powered fund analysis (Pro feature).",
                "Kotak Securities API: For live market index data.",
                "We do not sell your personal data to any third parties."
            ]
        },
        {
            icon: <Lock className="w-5 h-5" />,
            title: "Your Rights",
            content: [
                "Access: You can request a copy of your personal data at any time.",
                "Correction: You can update your account information through the app settings.",
                "Deletion: You can delete your account and all associated data from the Profile page.",
                "Portability: You can export your watchlists and preferences.",
                "Opt-out: You can disable notifications and marketing communications."
            ]
        },
        {
            icon: <Bell className="w-5 h-5" />,
            title: "Cookies & Local Storage",
            content: [
                "We use local storage to save your authentication token for seamless login.",
                "Theme preferences (light/dark mode) are stored locally.",
                "No third-party tracking cookies are used.",
                "You can clear local storage by logging out or clearing browser data."
            ]
        }
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link
                    to="/"
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-muted" />
                </Link>
                <div>
                    <h1 className="text-xl lg:text-2xl font-bold text-white">Privacy Policy</h1>
                    <p className="text-xs lg:text-sm text-muted">Last updated: {lastUpdated}</p>
                </div>
            </div>

            {/* Introduction */}
            <div className="bg-surface border border-border rounded-xl p-4 lg:p-6">
                <p className="text-sm lg:text-base text-muted leading-relaxed">
                    Welcome to <span className="text-primary font-semibold">FundX</span>. We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you use our mutual fund tracking application.
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-4">
                {sections.map((section, index) => (
                    <div
                        key={index}
                        className="bg-surface border border-border rounded-xl p-4 lg:p-6"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                {section.icon}
                            </div>
                            <h2 className="text-base lg:text-lg font-bold text-white">{section.title}</h2>
                        </div>
                        <ul className="space-y-2">
                            {section.content.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                                    <span className="text-primary mt-1">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Children's Privacy */}
            <div className="bg-surface border border-border rounded-xl p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-bold text-white mb-3">Children's Privacy</h2>
                <p className="text-sm text-muted">
                    FundX is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
                </p>
            </div>

            {/* Changes to Policy */}
            <div className="bg-surface border border-border rounded-xl p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-bold text-white mb-3">Changes to This Policy</h2>
                <p className="text-sm text-muted">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Continued use of the app after changes constitutes acceptance of the updated policy.
                </p>
            </div>

            {/* Contact */}
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4 lg:p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Mail className="w-5 h-5 text-primary" />
                    <h2 className="text-base lg:text-lg font-bold text-white">Contact Us</h2>
                </div>
                <p className="text-sm text-muted mb-3">
                    If you have any questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="space-y-1 text-sm">
                    <p className="text-muted">Email: <a href="mailto:support@fundx.app" className="text-primary hover:underline">support@fundx.app</a></p>
                    <p className="text-muted">Website: <Link to="/contact" className="text-primary hover:underline">Contact Page</Link></p>
                </div>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap gap-4 justify-center text-sm text-muted py-4">
                <Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
                <span>•</span>
                <Link to="/refunds" className="hover:text-primary transition-colors">Refund Policy</Link>
                <span>•</span>
                <Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
            </div>
        </div>
    );
};

export default Privacy;
