import React from 'react';
import { RefreshCw, CreditCard, Clock, CheckCircle } from 'lucide-react';

const Refunds = () => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Refund & Cancellation Policy</h1>
                <p className="text-muted">Last updated: December 2024</p>
            </div>

            <div className="bg-surface border border-border rounded-2xl p-8">
                <div className="prose prose-invert max-w-none">
                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <CreditCard className="w-6 h-6 text-primary" />
                            Subscription Cancellation
                        </h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>
                                You can cancel your Pro subscription at any time through your account profile. Here's what happens when you cancel:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Your subscription remains active until the end of the current billing period</li>
                                <li>You will continue to have access to Pro features until expiry</li>
                                <li>No charges will be made for future billing periods</li>
                                <li>After expiry, you have a 24-hour grace period before downgrade</li>
                                <li>After grace period, your account automatically reverts to Free tier</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <RefreshCw className="w-6 h-6 text-secondary" />
                            Refund Policy
                        </h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>
                                We want you to be completely satisfied with our service. Our refund policy is as follows:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                        <h3 className="font-bold text-white">Full Refund</h3>
                                    </div>
                                    <p className="text-sm text-green-300">
                                        Available within 7 days of purchase if no Pro features were used
                                    </p>
                                </div>

                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock className="w-5 h-5 text-yellow-400" />
                                        <h3 className="font-bold text-white">Partial Refund</h3>
                                    </div>
                                    <p className="text-sm text-yellow-300">
                                        Pro-rated refund available within 15 days of purchase
                                    </p>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mt-6 mb-3">Refund Eligibility</h3>
                            <p>You are eligible for a refund if:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Technical issues prevented you from using Pro features</li>
                                <li>You were charged incorrectly or multiple times</li>
                                <li>Service was significantly different from what was advertised</li>
                                <li>You request within our refund windows (7 or 15 days)</li>
                            </ul>

                            <h3 className="text-lg font-bold text-white mt-6 mb-3">Non-Refundable Conditions</h3>
                            <p>Refunds will not be provided in the following cases:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>After 15 days from the date of purchase</li>
                                <li>If you violated our Terms & Conditions</li>
                                <li>For renewals that you did not cancel before the renewal date</li>
                                <li>If your account was suspended for violating policies</li>
                            </ul>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">How to Request a Refund</h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>To request a refund, please follow these steps:</p>
                            <ol className="list-decimal list-inside space-y-3 ml-4">
                                <li>Send an email to <span className="text-primary font-medium">support@fundtracker.com</span></li>
                                <li>Include your account email and transaction ID</li>
                                <li>Provide a brief explanation for the refund request</li>
                                <li>Our team will review and respond within 2-3 business days</li>
                            </ol>
                            <p className="mt-4">
                                Once approved, refunds are typically processed within 5-7 business days and will be credited to the original payment method.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">Payment Issues</h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>
                                If you experience payment failures or errors:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Check your payment method for sufficient funds</li>
                                <li>Verify your billing information is correct</li>
                                <li>Try a different payment method if available</li>
                                <li>Contact our support team if the issue persists</li>
                            </ul>
                            <p className="mt-4">
                                Failed payments do not grant access to Pro features. If you were charged but didn't receive access, please contact us immediately for resolution.
                            </p>
                        </div>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">Auto-Renewal</h2>
                        <div className="space-y-4 text-muted leading-relaxed">
                            <p>
                                Our subscriptions do NOT auto-renew. You will need to manually renew your subscription when it expires. You will receive:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>An email reminder 3 days before expiry</li>
                                <li>A notification on your profile page</li>
                                <li>A 24-hour grace period after expiry to renew</li>
                            </ul>
                        </div>
                    </section>

                    <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
                        <h3 className="text-lg font-bold text-white mb-3">Questions?</h3>
                        <p className="text-muted text-sm">
                            If you have any questions about our Refund & Cancellation Policy, please contact us at{' '}
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

export default Refunds;
