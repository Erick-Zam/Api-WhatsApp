'use client';

import { useState } from 'react';
import { CheckCircleIcon, EnvelopeIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid';

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
            <div className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="theme-hero-surface w-full max-w-md rounded-2xl p-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-500">
                        <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <h2 className="theme-text-main mb-2 text-xl font-bold">Email Verified!</h2>
                    <p className="theme-text-muted mb-6 text-sm">Your account is now fully verified.</p>
                    <div className="animate-spin rounded-full h-2 w-2 bg-cyan-500 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="theme-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="theme-hero-surface w-full max-w-md overflow-hidden rounded-2xl">
                {/* Header */}
                <div className="border-b border-[color:color-mix(in_srgb,var(--border-soft)_78%,transparent)] bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent-strong)_12%,transparent),color-mix(in_srgb,var(--accent)_10%,transparent))] px-6 py-8">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] text-[color:var(--accent-strong)]">
                        <EnvelopeIcon className="w-6 h-6" />
                    </div>
                    <h2 className="theme-text-main mb-2 text-center text-2xl font-bold">Verify Your Email</h2>
                    <p className="theme-text-muted text-center text-sm">
                        We sent a verification link to <span className="font-semibold text-[color:var(--accent-strong)]">{email}</span>
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-6 space-y-4">
                    {showSuccess && (
                        <div className="theme-badge-success flex gap-3 rounded-lg p-3">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold">Verification email sent!</p>
                                <p className="text-xs opacity-80">Check your inbox and spam folder.</p>
                            </div>
                        </div>
                    )}

                    <div className="theme-card-muted rounded-lg p-4 text-center">
                        <p className="theme-text-muted mb-3 text-sm">
                            Click the link in your email to verify your account, or check here:
                        </p>
                        <button
                            onClick={handleCheckEmail}
                            type="button"
                            className="w-full rounded-lg border border-[color:color-mix(in_srgb,var(--accent-strong)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--accent)_18%,transparent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-strong)] transition hover:border-[color:color-mix(in_srgb,var(--accent-strong)_55%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--accent)_24%,transparent)] flex items-center justify-center gap-2"
                        >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            Check Verification Status
                        </button>
                    </div>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[color:color-mix(in_srgb,var(--border-soft)_72%,transparent)]"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="theme-card px-2 theme-text-soft">or</span>
                        </div>
                    </div>

                    <button
                        onClick={handleResend}
                        disabled={isResending}
                        type="button"
                        className="theme-button-secondary w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isResending ? 'Sending...' : 'Resend Verification Email'}
                    </button>

                    <p className="theme-text-soft mt-4 text-center text-xs">
                        You can verify your email later in Settings if you prefer
                    </p>
                </div>

                {/* Footer */}
                <div className="flex gap-3 border-t border-[color:color-mix(in_srgb,var(--border-soft)_78%,transparent)] bg-[color:color-mix(in_srgb,var(--surface-muted)_82%,transparent)] px-6 py-4">
                    <button
                        onClick={onClose}
                        className="theme-button-secondary flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition"
                    >
                        I&apos;ll Verify Later
                    </button>
                    <button
                        onClick={handleCheckEmail}
                        className="flex-1 rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:brightness-110"
                    >
                        Checking Now
                    </button>
                </div>
            </div>
        </div>
    );
}
