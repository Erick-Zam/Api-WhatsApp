'use client';

import { useState, ReactNode } from 'react';
import { CheckCircleIcon, XMarkIcon, EnvelopeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';

interface EmailVerificationModalProps {
    email: string;
    onClose: () => void;
    onResend?: () => void;
}

export default function EmailVerificationModal({ email, onClose, onResend }: EmailVerificationModalProps) {
    const [isResending, setIsResending] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleResend = async () => {
        if (!onResend) return;
        
        setIsResending(true);
        try {
            await onResend();
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to resend:', error);
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckEmail = () => {
        // In a real app, you'd check if the token in query params verified the user
        // For now, we just allow them to proceed
        setIsVerified(true);
        setTimeout(() => {
            onClose();
        }, 1500);
    };

    if (isVerified) {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-700/50 max-w-md w-full rounded-2xl p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-emerald-600/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Email Verified!</h2>
                    <p className="text-gray-400 text-sm mb-6">Your account is now fully verified.</p>
                    <div className="animate-spin rounded-full h-2 w-2 bg-cyan-500 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700/50 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600/10 to-blue-600/10 px-6 py-8 border-b border-zinc-800/50">
                    <div className="w-12 h-12 bg-cyan-600/20 text-cyan-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <EnvelopeIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-2">Verify Your Email</h2>
                    <p className="text-gray-400 text-center text-sm">
                        We sent a verification link to <span className="font-semibold text-cyan-400">{email}</span>
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-4">
                    {showSuccess && (
                        <div className="bg-emerald-600/10 border border-emerald-500/30 rounded-lg p-3 flex gap-3">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-400">Verification email sent!</p>
                                <p className="text-xs text-emerald-400/70">Check your inbox and spam folder.</p>
                            </div>
                        </div>
                    )}

                    <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-400 mb-3">
                            Click the link in your email to verify your account, or check here:
                        </p>
                        <button
                            onClick={handleCheckEmail}
                            type="button"
                            className="w-full py-2.5 px-4 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-600/30 hover:border-cyan-600/50 text-cyan-400 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
                        >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            Check Verification Status
                        </button>
                    </div>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-700/30"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-zinc-900 text-gray-500">or</span>
                        </div>
                    </div>

                    <button
                        onClick={handleResend}
                        disabled={isResending}
                        type="button"
                        className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-gray-200 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isResending ? 'Sending...' : 'Resend Verification Email'}
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-4">
                        You can verify your email later in Settings if you prefer
                    </p>
                </div>

                {/* Footer */}
                <div className="bg-zinc-800/30 px-6 py-4 border-t border-zinc-800/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-gray-200 rounded-lg text-sm font-medium transition"
                    >
                        I'll Verify Later
                    </button>
                    <button
                        onClick={handleCheckEmail}
                        className="flex-1 py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition"
                    >
                        Checking Now
                    </button>
                </div>
            </div>
        </div>
    );
}
