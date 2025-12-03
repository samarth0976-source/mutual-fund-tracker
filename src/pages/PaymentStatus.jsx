import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PaymentStatus = () => {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order_id');
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [status, setStatus] = useState('verifying');

    useEffect(() => {
        const verifyPayment = async () => {
            if (!orderId) {
                setStatus('error');
                return;
            }

            try {
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const token = localStorage.getItem('token');

                const response = await fetch(`${API_URL}/api/payment/verify`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ orderId })
                });

                const data = await response.json();

                if (data.success) {
                    setStatus('success');
                    await refreshUser(); // Update local user state
                    setTimeout(() => navigate('/dashboard'), 3000);
                } else {
                    setStatus('failed');
                }
            } catch (error) {
                console.error("Verification error:", error);
                setStatus('error');
            }
        };

        verifyPayment();
    }, [orderId, navigate, refreshUser]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                {status === 'verifying' && (
                    <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h2 className="text-xl font-semibold">Verifying Payment...</h2>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
                        <p className="text-gray-600">Your Pro subscription is now active.</p>
                        <p className="text-sm text-gray-400 mt-4">Redirecting to dashboard...</p>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
                        <p className="text-gray-600">We couldn't verify your payment.</p>
                        <button
                            onClick={() => navigate('/payment')}
                            className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Try Again
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentStatus;
