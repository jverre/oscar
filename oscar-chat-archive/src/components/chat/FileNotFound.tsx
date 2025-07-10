"use client";

import { useRouter } from "next/navigation";
import { useAuthenticatedQuery } from "@/hooks/useAuthenticatedQuery";
import { api } from "../../../convex/_generated/api";

interface FileNotFoundProps {
    fileName?: string;
}

export function FileNotFound({ fileName }: FileNotFoundProps = {}) {
    const router = useRouter();
    
    // Get user's organization for URL generation
    const userOrg = useAuthenticatedQuery(api.organizations.getCurrentUserOrg); // TODO: Fix with NextAuth integration

    const handleGoHome = () => {
        router.push('/');
    };

    return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">File Not Found</h1>
                    <p className="text-muted-foreground">
                        {fileName 
                            ? `The file "${fileName}" doesn't exist or has been deleted.`
                            : "The file you're looking for doesn't exist or has been deleted."
                        }
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