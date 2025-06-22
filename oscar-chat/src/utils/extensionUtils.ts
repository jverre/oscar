export const CHAT_EXTENSION = '.chat';
export const SUPPORTED_EXTENSIONS = ['.chat'] as const;

export type SupportedExtension = typeof SUPPORTED_EXTENSIONS[number];

/**
 * Adds an extension to a title if it doesn't already have one
 */
export function addExtension(title: string, extension: string): string {
    if (!title) return extension;
    
    // Check if title already has this extension
    if (title.endsWith(extension)) {
        return title;
    }
    
    // Check if title has any supported extension
    const existingExtension = getExtension(title);
    if (existingExtension) {
        return title; // Keep existing extension
    }
    
    return title + extension;
}

/**
 * Removes the extension from a title
 */
export function removeExtension(title: string): string {
    if (!title) return title;
    
    const extension = getExtension(title);
    if (extension) {
        return title.slice(0, -extension.length);
    }
    
    return title;
}

/**
 * Gets the extension from a title, returns null if no supported extension found
 */
export function getExtension(title: string): string | null {
    if (!title) return null;
    
    for (const extension of SUPPORTED_EXTENSIONS) {
        if (title.endsWith(extension)) {
            return extension;
        }
    }
    
    return null;
}

/**
 * Checks if a title has a valid supported extension
 */
export function hasValidExtension(title: string): boolean {
    return getExtension(title) !== null;
}

/**
 * Ensures a title has the specified extension, adding it if missing
 */
export function ensureExtension(title: string, extension: string): string {
    return addExtension(title, extension);
}

/**
 * Gets the base name without extension (useful for display and editing)
 */
export function getBaseName(title: string): string {
    return removeExtension(title);
}

/**
 * Ensures a chat title has the .chat extension
 */
export function ensureChatExtension(title: string): string {
    return ensureExtension(title, CHAT_EXTENSION);
}

/**
 * Validates and normalizes a conversation title for creation/editing
 */
export function normalizeConversationTitle(title: string): string {
    if (!title || !title.trim()) {
        return 'New Chat' + CHAT_EXTENSION;
    }
    
    const trimmed = title.trim();
    return ensureChatExtension(trimmed);
}