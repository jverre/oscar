"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { SignInButton } from "@/components/auth/SignInButton";

export default function SignInPage() {
    const user = useQuery(api.users.current);
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Check if this is from VS Code extension
    const isExtension = searchParams.get('source') === 'extension' || 
                       searchParams.get('extension') === 'true';

    useEffect(() => {
        if (user) {
            // User is already signed in
            if (isExtension) {
                // Redirect to extension success page
                router.push('/auth/extension-success');
            } else {
                // Redirect to home - it will handle the org/team redirect
                router.push('/');
            }
        }
    }, [user, router, isExtension]);

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
                    {/* Oscar Logo/Icon */}
                    <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center rounded-full" style={{ backgroundColor: 'var(--interactive-primary)' }}>
                        <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>O</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        {isExtension ? 'Connect VS Code to Oscar' : 'Welcome to Oscar'}
                    </h1>

                    {/* Subtitle */}
                    <p style={{ color: 'var(--text-secondary)' }} className="mb-6">
                        {isExtension 
                            ? 'Sign in to sync your Claude Code sessions'
                            : 'Sign in to access your AI chat history'
                        }
                    </p>

                    {/* Extension-specific instructions */}
                    {isExtension && (
                        <div className="mb-6 p-4 rounded" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            <p style={{ color: 'var(--text-primary)' }} className="text-sm font-medium mb-2">
                                🔗 VS Code Extension Setup
                            </p>
                            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                                After signing in, your Claude Code logs will automatically sync to Oscar.
                            </p>
                        </div>
                    )}

                    {/* Sign In Button */}
                    <div className="mb-6">
                        <SignInButton 
                            afterSignInUrl={isExtension ? '/auth/extension-success' : '/'}
                            variant="default"
                        />
                    </div>

                    {/* Help text */}
                    <p style={{ color: 'var(--text-secondary)' }} className="text-xs">
                        By signing in, you agree to our terms and privacy policy
                    </p>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p style={{ color: 'var(--text-secondary)' }} className="text-xs">
                        Need help?{' '}
                        <a 
                            href="/support" 
                            style={{ color: 'var(--text-accent)' }}
                            className="hover:underline"
                        >
                            Contact Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}