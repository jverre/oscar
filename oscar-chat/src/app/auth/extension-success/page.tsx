"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";

export default function ExtensionSuccessPage() {
    const user = useQuery(api.users.current);

    if (user === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-primary)' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--text-accent)' }}></div>
                    <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (user === null) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-primary)' }}>
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Authentication Required
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Please sign in to continue.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-primary)' }}>
            <div className="max-w-md w-full mx-auto p-8">
                <div 
                    className="rounded-lg p-8 text-center shadow-lg"
                    style={{ 
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border-subtle)'
                    }}
                >
                    {/* Success Icon */}
                    <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--status-success)' }}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Successfully Signed In!
                    </h1>

                    {/* User info */}
                    <div className="mb-6">
                        <p style={{ color: 'var(--text-secondary)' }} className="mb-2">
                            Welcome back, <span style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                            Your VS Code extension is now connected to Oscar
                        </p>
                    </div>

                    {/* Instructions */}
                    <div className="mb-6 p-4 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                        <p style={{ color: 'var(--text-primary)' }} className="text-sm font-medium mb-2">
                            🎉 Authentication Complete
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                            You can now return to VS Code. Your Claude Code sessions will be automatically synced to Oscar.
                        </p>
                    </div>

                    {/* Close instructions */}
                    <div className="text-center">
                        <p style={{ color: 'var(--text-secondary)' }} className="text-sm mb-4">
                            You can now close this page and return to VS Code
                        </p>
                        
                        <button
                            onClick={() => window.close()}
                            className="px-4 py-2 rounded text-sm font-medium transition-colors"
                            style={{ 
                                backgroundColor: 'var(--interactive-primary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-primary)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--interactive-primary)';
                            }}
                        >
                            Close Window
                        </button>
                    </div>
                </div>

                {/* Additional help */}
                <div className="mt-6 text-center">
                    <p style={{ color: 'var(--text-secondary)' }} className="text-xs">
                        Having issues? Check the VS Code extension logs or{' '}
                        <Link 
                            href="/support" 
                            style={{ color: 'var(--text-accent)' }}
                            className="hover:underline"
                        >
                            contact support
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}