import React from 'react';
import { FileText, Shield, AlertCircle } from 'lucide-react';

const Terms = () => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Terms & Conditions</h1>
                <p className="text-muted">Last updated: December 2024</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-8">
                <div className="prose prose-invert max-w-none">
                    <div className="flex items-start gap-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-8">
                        <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                        <p className="text-sm text-blue-300">
                            Please read these Terms and Conditions carefully before using our Mutual Fund Tracker service.
                        </p>
                    </div>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <FileText className="w-6 h-6 text-primary" />
                            1. Acceptance of Terms
                        </h2>
                        <p className="text muted leading-relaxed">
                            By accessing and using the Mutual Fund Tracker service, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these Terms & Conditions, please do not use this service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <Shield className="w-6 h-6 text-secondary" />
                            2. Use License
                        </h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>Permission is granted to temporarily access the Mutual Fund Tracker for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Modify or copy the materials</li>
                                <li>Use the materials for any commercial purpose</li>
                                <li>Attempt to decompile or reverse engineer any software</li>
                                <li>Remove any copyright or proprietary notations</li>
                                <li>Transfer the materials to another person</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">3. Subscription Services</h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>Our Pro subscription provides enhanced features:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Subscription is billed monthly at ₹50 per month</li>
                                <li>You can cancel your subscription at any time</li>
                                <li>Refunds are available as per our Refund & Cancellation Policy</li>
                                <li>Upon expiry, you have a 24-hour grace period before downgrade to Free tier</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Disclaimer</h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>
                                The materials on Mutual Fund Tracker are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
                            </p>
                            <p>
                                We do not provide financial advice. All information displayed is for informational purposes only. Always consult with a qualified financial advisor before making investment decisions.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Limitations</h2>
                        <p className="text-muted leading-relaxed">
                            In no event shall Mutual Fund Tracker or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Mutual Fund Tracker, even if we or an authorized representative has been notified orally or in writing of the possibility of such damage.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">6. Privacy</h2>
                        <p className="text-muted leading-relaxed">
                            Your use of Mutual Fund Tracker is also governed by our Privacy Policy. We collect and use your personal information in accordance with applicable data protection laws. Your data is stored securely and never sold to third parties.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">7. Modifications</h2>
                        <p className="text-muted leading-relaxed">
                            We may revise these Terms & Conditions at any time without notice. By using this service you are agreeing to be bound by the then current version of these Terms & Conditions. We will notify users of any significant changes via email or through the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">8. Governing Law</h2>
                        <p className="text-muted leading-relaxed">
                            These terms and conditions are governed by and construed in accordance with the laws of India and you irrevocably submit to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
                        </p>
                    </section>

                    <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-3">Contact Us</h3>
                        <p className="text-muted text-sm">
                            If you have any questions about these Terms & Conditions, please contact us at{' '}
                            <a href="mailto:support@fundtracker.com" className="text-primary hover:underline">
                                support@fundtracker.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Terms;
