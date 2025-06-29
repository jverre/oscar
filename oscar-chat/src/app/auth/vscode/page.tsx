"use client";

import { SignInButton } from "@/components/auth/SignInButton";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function VSCodeAuth() {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const getOrCreateApiKey = useMutation(api.apiKeys.getOrCreateApiKey);

    useEffect(() => {
        if (isAuthenticated) {
            // Get callback URL from query params
            const params = new URLSearchParams(window.location.search);
            const callbackUrl = params.get('callback');
            
            if (callbackUrl) {
                // Get or create API key and send to VS Code
                const sendApiKey = async () => {
                    try {
                        console.log('🔧 AUTH DEBUG: Getting API key...');
                        
                        // Get or create API key for VS Code
                        const apiKeyData = await getOrCreateApiKey({ name: "VS Code Extension" });
                        
                        console.log('🔧 AUTH DEBUG: API key obtained');
                        console.log('🔧 AUTH DEBUG: API key preview:', `${apiKeyData.key.substring(0, 8)}...`);
                        
                        // Send API key to VS Code
                        const requestUrl = `${callbackUrl}?token=${apiKeyData.key}`;
                        console.log('🔧 AUTH DEBUG: Sending API key to VS Code:', callbackUrl);
                        
                        // Make a background request to send API key to VS Code
                        await fetch(requestUrl, { mode: 'no-cors' });
                        console.log('✅ API key callback sent successfully');
                    } catch (error) {
                        console.error('❌ Failed to get API key or send to VS Code:', error);
                    }
                };

                // Send API key after short delay to ensure auth is ready
                setTimeout(sendApiKey, 2000);
            }
        }
    }, [isAuthenticated]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-primary)' }}>
                <div style={{ color: 'var(--text-primary)' }}>Loading...</div>
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-primary)' }}>
                <div className="text-center">
                    <div style={{ color: 'var(--status-success)' }} className="text-xl mb-4">
                        ✓ Authentication Successful
                    </div>
                    <div style={{ color: 'var(--text-primary)' }} className="text-lg mb-2">
                        You are now ready to use the Oscar extension
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }} className="text-sm">
                        You can close this window and return to VS Code
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-primary)' }}>
            <div className="max-w-md w-full mx-auto p-8">
                <div className="text-center mb-8">
                    <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-2">
                        Sign in to Oscar
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
                        Connect your VS Code extension to Oscar
                    </p>
                </div>
                
                <div className="space-y-4">
                    <SignInButton />
                </div>
            </div>
        </div>
    );
}