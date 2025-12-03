import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, Shield, Zap, CreditCard } from 'lucide-react';

const PaymentPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    const handleSubscribe = async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Create Order
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const orderData = await response.json();

            if (!response.ok) {
                throw new Error(orderData.error || 'Failed to create order');
            }

            // 2. Initialize Cashfree
            const cashfree = new window.Cashfree({
                mode: "production"
            });

            // 3. Open Checkout Popup
            const checkoutOptions = {
                paymentSessionId: orderData.payment_session_id,
                redirectTarget: "_modal",
            };

            cashfree.checkout(checkoutOptions).then((result) => {
                if (result.error) {
                    console.log("User has closed the popup or there is some payment error", result.error);
                    setError("Payment cancelled or failed. Please try again.");
                    setLoading(false);
                }
                if (result.redirect) {
                    console.log("Payment will be redirected");
                    // Handle redirection if needed, though usually _modal handles it
                }
                if (result.paymentDetails) {
                    console.log("Payment has been completed", result.paymentDetails.paymentMessage);
                    // Verify payment on backend
                    navigate(`/payment/status?order_id=${orderData.order_id}`);
                }
            });

        } catch (err) {
            console.error("Payment Error:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl">
                <div className="md:flex">
                    <div className="p-8 w-full">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold mb-1">Premium Access</div>
                        <h1 className="block mt-1 text-lg leading-tight font-medium text-black">Upgrade to Pro</h1>
                        <p className="mt-2 text-gray-500">Unlock advanced features to supercharge your mutual fund analysis.</p>

                        <div className="mt-6 space-y-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Check className="h-6 w-6 text-green-500" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">Unlimited Search</p>
                                    <p className="text-sm text-gray-500">Search for any mutual fund without restrictions.</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Zap className="h-6 w-6 text-yellow-500" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">View All Funds</p>
                                    <p className="text-sm text-gray-500">Access the complete list of top performing funds.</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Shield className="h-6 w-6 text-blue-500" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900">Priority Support</p>
                                    <p className="text-sm text-gray-500">Get faster responses to your queries.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-2xl font-bold text-gray-900">₹1.00<span className="text-sm text-gray-500 font-normal">/month</span></span>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleSubscribe}
                                disabled={loading}
                                className={`w-full flex justify-center items-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {loading ? (
                                    <>Processing...</>
                                ) : (
                                    <>
                                        <CreditCard className="mr-2 h-5 w-5" />
                                        Subscribe Now
                                    </>
                                )}
                            </button>
                            <p className="mt-3 text-xs text-center text-gray-500">
                                Secure payment via Cashfree. Cancel anytime.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
