"use client";

import { useAuthenticatedQuery } from "@/hooks/useAuthenticatedQuery";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../convex/_generated/api";

interface AuthGuardProps {
    children: React.ReactNode;
    allowPublicFiles?: boolean;
}

export function AuthGuard({ children, allowPublicFiles = false }: AuthGuardProps) {
    const user = useAuthenticatedQuery(api.users.current); // TODO: Fix with NextAuth integration
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    // Check if accessing a file (could be public)
    const fileId = searchParams.get("file");
    const fileName = searchParams.get("fileName");
    const isSearchParamFile = fileId || fileName;
    
    // Check if accessing file via /{org}/{team}/{filename} route
    const isOrgTeamFileRoute = pathname && pathname !== "/" && pathname.split("/").length >= 4;
    
    const isAccessingFile = isSearchParamFile || isOrgTeamFileRoute;

    // For public file access, allow unauthenticated users
    const shouldAllowAccess = allowPublicFiles && isAccessingFile;

    // Redirect unauthenticated users (unless accessing public files)
    useEffect(() => {
        if (user === null && !shouldAllowAccess) {
            router.push("/");
        }
    }, [user, router, shouldAllowAccess]);

    // Show loading while checking authentication
    if (user === undefined) {
        return (
            <div className="flex items-center justify-center flex-1">
                <div className="text-terminal-green font-mono">Loading...</div>
            </div>
        );
    }

    // Don't render anything if user is not authenticated (unless accessing public files)
    if (user === null && !shouldAllowAccess) {
        return (
            <div className="flex items-center justify-center flex-1">
                <div className="text-terminal-green font-mono">Redirecting...</div>
            </div>
        );
    }

    // User is authenticated or accessing public files, render children
    return <>{children}</>;
}