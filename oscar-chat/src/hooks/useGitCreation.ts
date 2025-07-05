"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

interface UseGitCreationReturn {
    createGitFolder: (repoUrl: string) => Promise<Id<"files"> | null>;
    isCreating: boolean;
    error: string | null;
}

export function useGitCreation(): UseGitCreationReturn {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    //const createGitFolderMutation = useMutation(api.files.createGitFolder);

    const createGitFolder = useCallback(async (repoUrl: string): Promise<Id<"files"> | null> => {
        // Prevent concurrent creation attempts
        if (isCreating) {
            console.warn("Git folder creation already in progress");
            return null;
        }

        setIsCreating(true);
        setError(null);

        try {
            // Support both formats: full URL and short format (user/repo)
            let normalizedUrl: string;
            
            // Check if it's already a full GitHub URL
            const fullUrlRegex = /^https:\/\/github\.com\/[^/]+\/[^/]+(?:\.git)?\/?$/;
            if (fullUrlRegex.test(repoUrl)) {
                normalizedUrl = repoUrl;
            } else {
                // Check if it's short format (user/repo)
                const shortFormatRegex = /^[^/\s]+\/[^/\s]+$/;
                if (shortFormatRegex.test(repoUrl)) {
                    normalizedUrl = `https://github.com/${repoUrl}`;
                } else {
                    throw new Error("Invalid format. Please use: https://github.com/user/repo or user/repo");
                }
            }

            // Create the Git folder with normalized URL
            // const fileId = await createGitFolderMutation({
            //     repoUrl: normalizedUrl.trim(),
            // });
            const fileId = undefined;

            if (!fileId) {
                throw new Error("Failed to create Git folder - no ID returned");
            }

            return fileId;
        } catch (error) {
            console.error("Failed to create Git folder:", error);
            
            // Extract error message for user-friendly display
            const errorMessage = error instanceof Error ? error.message : "Failed to create Git folder";
            setError(errorMessage);
            
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [isCreating]);

    return {
        createGitFolder,
        isCreating,
        error,
    };
}