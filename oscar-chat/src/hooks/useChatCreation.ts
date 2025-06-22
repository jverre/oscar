"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTabContext } from "@/contexts/TabContext";
import { normalizeConversationTitle, getBaseName } from "@/utils/extensionUtils";
import type { Id } from "../../convex/_generated/dataModel";

interface CreateChatOptions {
  title?: string;           // Optional custom title
  initialMessage?: string;  // For auto-generating title from first message
  navigate?: boolean;       // Whether to navigate to new chat (default: true)
  skipNormalization?: boolean; // Skip adding .chat extension (for sidebar input flow)
}

interface UseChatCreationReturn {
  createChat: (options?: CreateChatOptions) => Promise<Id<"conversations"> | null>;
  isCreating: boolean;
}

export function useChatCreation(): UseChatCreationReturn {
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { addTab, getTabByConversation, switchToTab } = useTabContext();
  const createConversationMutation = useMutation(api.conversations.create);

  const createChat = useCallback(async (options: CreateChatOptions = {}): Promise<Id<"conversations"> | null> => {
    const { 
      title, 
      initialMessage, 
      navigate = true,
      skipNormalization = false
    } = options;

    // Prevent concurrent creation attempts
    if (isCreating) {
      console.warn("Chat creation already in progress");
      return null;
    }

    setIsCreating(true);

    try {
      // Determine the conversation title
      let conversationTitle = title || "New Chat";
      
      // If no title but there's an initial message, generate title from it
      if (!title && initialMessage) {
        conversationTitle = initialMessage.slice(0, 50) + (initialMessage.length > 50 ? "..." : "");
      }

      // Normalize the title to ensure it has the .chat extension (unless skipped)
      const normalizedTitle = skipNormalization ? conversationTitle : normalizeConversationTitle(conversationTitle);

      // Create the conversation
      const conversationId = await createConversationMutation({
        title: normalizedTitle,
      });

      if (!conversationId) {
        throw new Error("Failed to create conversation - no ID returned");
      }

      // Check if a tab already exists for this conversation (shouldn't happen for new conversations)
      const existingTab = getTabByConversation(conversationId);
      
      if (existingTab) {
        // Unlikely scenario, but handle it by switching to existing tab
        if (navigate) {
          switchToTab(existingTab.id);
        }
      } else {
        // Create a new tab
        const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Determine tab title (may be shorter than conversation title)
        // Keep the extension in tab titles for clarity
        const tabTitle = initialMessage 
          ? (skipNormalization 
              ? initialMessage.slice(0, 30) + (initialMessage.length > 30 ? "..." : "")
              : normalizeConversationTitle(initialMessage.slice(0, 30) + (initialMessage.length > 30 ? "..." : "")))
          : normalizedTitle;
        
        addTab({
          id: newTabId,
          conversationId: conversationId,
          title: tabTitle,
        });

        // Navigate if requested (addTab already sets it as active)
        if (navigate) {
          router.push(`/chat?conversation=${conversationId}`);
        }
      }

      return conversationId;
    } catch (error) {
      console.error("Failed to create chat:", error);
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [isCreating, createConversationMutation, getTabByConversation, switchToTab, addTab, router]);

  return {
    createChat,
    isCreating,
  };
}