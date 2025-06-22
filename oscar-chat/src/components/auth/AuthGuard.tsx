"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";

interface AuthGuardProps {
    children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const user = useQuery(api.users.current);
    const router = useRouter();

    // Redirect unauthenticated users
    useEffect(() => {
        if (user === null) {
            router.push("/");
        }
    }, [user, router]);

    // Show loading while checking authentication
    if (user === undefined) {
        return (
            <div className="flex items-center justify-center flex-1">
                <div className="text-terminal-green font-mono">Loading...</div>
            </div>
        );
    }

    // Don't render anything if user is not authenticated
    if (user === null) {
        return (
            <div className="flex items-center justify-center flex-1">
                <div className="text-terminal-green font-mono">Redirecting...</div>
            </div>
        );
    }

    // User is authenticated, render children
    return <>{children}</>;
}