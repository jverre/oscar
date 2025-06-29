"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function FileNotFound() {
    const router = useRouter();
    
    // Get user's organization and team for URL generation
    const userOrg = useQuery(api.organizations.getCurrentUserOrg);
    const userTeam = useQuery(api.teams.getCurrentUserTeam);

    const handleGoHome = () => {
        if (userOrg && userTeam) {
            router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
        } else {
            router.push("/chat");
        }
    };

    return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">File Not Found</h1>
                    <p className="text-muted-foreground">
                        The file you're looking for doesn't exist or has been deleted.
                    </p>
                </div>
                <div className="space-y-4">
                    <button
                        onClick={handleGoHome}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Start New Chat
                    </button>
                    <div className="text-sm text-muted-foreground font-mono">
                        Error 404: File not found
                    </div>
                </div>
            </div>
        </div>
    );
}