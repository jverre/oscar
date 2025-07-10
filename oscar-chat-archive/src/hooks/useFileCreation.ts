"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useAuthenticatedQuery } from "@/hooks/useAuthenticatedQuery";
import { api } from "../../convex/_generated/api";
import { useTabContext } from "@/contexts/TabContext";
import { normalizeConversationTitle, normalizeBlogTitle, normalizeClaudeSessionTitle } from "@/utils/extensionUtils";
import { generateUniqueFileName, validateFileName } from "@/utils/fileNameUtils";
import type { Id } from "../../convex/_generated/dataModel";

interface CreateFileOptions {
  name?: string;           // Optional custom name
  initialMessage?: string;  // For auto-generating name from first message
  navigate?: boolean;       // Whether to navigate to new file (default: true)  
  skipNormalization?: boolean; // Skip adding extension (for sidebar input flow)
  autoNumber?: boolean;     // Auto-number if duplicate exists (default: true)
  fileType?: 'chat' | 'blog' | 'claude_session'; // File type to create (default: 'chat')
}

interface UseFileCreationReturn {
  createFile: (options?: CreateFileOptions) => Promise<Id<"files"> | null>;
  isCreating: boolean;
  error: string | null;
}

export function useFileCreation(): UseFileCreationReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { addTab, getTabByFile, switchToTab } = useTabContext();
  const createFileMutation = useMutation(api.files.create);
  
  // Get existing files for duplicate checking
  const existingFiles = useAuthenticatedQuery(api.files.list);
  
  // Get user's organization for URL generation
  const userOrg = useAuthenticatedQuery(api.organizations.getCurrentUserOrg); // TODO: Fix with NextAuth integration

  const createFile = useCallback(async (options: CreateFileOptions = {}): Promise<Id<"files"> | null> => {
    const { 
      name, 
      initialMessage, 
      navigate = true,
      skipNormalization = false,
      autoNumber = true,
      fileType = 'chat'
    } = options;

    // Prevent concurrent creation attempts
    if (isCreating) {
      console.warn("File creation already in progress");
      return null;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Determine the file name based on file type
      let fileName = name || 
        (fileType === 'blog' ? "New Blog.blog" : 
         fileType === 'claude_session' ? "New Claude Session.claude_session" : 
         "New File.chat");
      
      // If no name but there's an initial message, generate name from it
      if (!name && initialMessage) {
        fileName = initialMessage.slice(0, 50) + (initialMessage.length > 50 ? "..." : "");
      }

      // Normalize the name to ensure it has the correct extension (unless skipped)
      let normalizedName: string;
      if (skipNormalization) {
        normalizedName = fileName;
      } else {
        normalizedName = fileType === 'blog' 
          ? normalizeBlogTitle(fileName)
          : fileType === 'claude_session'
          ? normalizeClaudeSessionTitle(fileName)
          : normalizeConversationTitle(fileName);
      }
      
      // Validate the file name
      const validationError = validateFileName(normalizedName);
      if (validationError) {
        setError(validationError);
        return null;
      }

      // Handle duplicate names with auto-numbering if enabled
      if (autoNumber && existingFiles) {
        const existingNames = existingFiles.map(file => file.name);
        normalizedName = generateUniqueFileName(normalizedName, existingNames);
      }

      // Create the file (org/team determined from user's profile)
      const fileId = await createFileMutation({
        name: normalizedName,
      });

      if (!fileId) {
        throw new Error("Failed to create file - no ID returned");
      }

      // Check if a tab already exists for this file (shouldn't happen for new files)
      const existingTab = getTabByFile(fileId);
      
      if (existingTab) {
        // Unlikely scenario, but handle it by switching to existing tab
        if (navigate) {
          switchToTab(existingTab.id);
        }
      } else {
        // Create a new tab
        const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Determine tab title (use the final normalized name)
        const tabTitle = normalizedName;
        
        addTab({
          id: newTabId,
          fileId: fileId,
          title: tabTitle,
        });

        // Navigate if requested (addTab already sets it as active)
        if (navigate) {
          // Use new URL format: /{filename}
          router.push(`/${encodeURIComponent(normalizedName)}`);
        }
      }

      return fileId;
    } catch (error) {
      console.error("Failed to create file:", error);
      
      // Extract error message for user-friendly display
      const errorMessage = error instanceof Error ? error.message : "Failed to create file";
      setError(errorMessage);
      
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, createFileMutation, getTabByFile, switchToTab, addTab, router, existingFiles, userOrg]);

  return {
    createFile,
    isCreating,
    error,
  };
}