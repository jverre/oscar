"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSearchParams } from "next/navigation";

export default function AuthSuccessPage() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('return_to');
    
    console.log("AuthSuccessPage - session:", session);
    console.log("AuthSuccessPage - session?.user:", session?.user);
    console.log("AuthSuccessPage - returnTo:", returnTo);
    
    // Get user's organization to find their subdomain
    const userId = session?.user?.id || session?.user?._id;
    console.log("AuthSuccessPage - userId:", userId);
    
    const user = useQuery(api.users.current, userId ? { userId: userId as any } : "skip");
    const organization = useQuery(api.organizations.getCurrentUserOrg, 
        user?._id ? { userId: user._id } : "skip"
    );

    console.log("AuthSuccessPage - user:", user);
    console.log("AuthSuccessPage - organization:", organization);

    useEffect(() => {
        console.log("AuthSuccessPage useEffect - returnTo:", returnTo);
        console.log("AuthSuccessPage useEffect - organization:", organization);
        console.log("AuthSuccessPage useEffect - session:", session);
        console.log("AuthSuccessPage useEffect - window.location:", window.location);
        
        if (returnTo) {
            // Redirect to specific subdomain ROOT (not auth path)
            console.log("Redirecting to specific subdomain:", returnTo);
            const protocol = window.location.protocol;
            const port = window.location.port ? `:${window.location.port}` : '';
            const redirectUrl = `${protocol}//${returnTo}.app.local${port}/`;
            console.log("Redirect URL:", redirectUrl);
            window.location.href = redirectUrl;
        } else if (organization?.subdomain) {
            // Redirect to user's personal subdomain ROOT (not auth path)
            console.log("Redirecting to user's personal subdomain:", organization.subdomain);
            const protocol = window.location.protocol;
            const port = window.location.port ? `:${window.location.port}` : '';
            const redirectUrl = `${protocol}//${organization.subdomain}.app.local${port}/`;
            console.log("Redirect URL:", redirectUrl);
            window.location.href = redirectUrl;
        } else {
            console.log("No redirect conditions met");
            console.log("- returnTo:", returnTo);
            console.log("- organization:", organization);
            console.log("- session:", session);
            console.log("- session?.user?.id:", session?.user?.id);
            console.log("- user query result:", user);
        }
    }, [returnTo, organization, session, user]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-primary)' }}>
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--text-accent)' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Completing sign-in...</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '10px' }}>
                    Debug: session={session ? 'yes' : 'no'}, returnTo={returnTo || 'none'}, org={organization?.subdomain || 'none'}
                </p>
            </div>
        </div>
    );
}