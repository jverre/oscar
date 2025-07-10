const CHAT_EXTENSION = '.chat';
const BLOG_EXTENSION = '.blog';
const CLAUDE_SESSION_EXTENSION = '.claude_session';
const SUPPORTED_EXTENSIONS = ['.chat', '.blog', '.claude_session'] as const;

/**
 * Adds an extension to a title if it doesn't already have one
 */
function addExtension(title: string, extension: string): string {
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
 * Gets the extension from a title, returns null if no supported extension found
 */
function getExtension(title: string): string | null {
    if (!title) return null;
    
    for (const extension of SUPPORTED_EXTENSIONS) {
        if (title.endsWith(extension)) {
            return extension;
        }
    }
    
    return null;
}


/**
 * Ensures a title has the specified extension, adding it if missing
 */
function ensureExtension(title: string, extension: string): string {
    return addExtension(title, extension);
}


/**
 * Ensures a chat title has the .chat extension
 */
function ensureChatExtension(title: string): string {
    return ensureExtension(title, CHAT_EXTENSION);
}

/**
 * Ensures a blog title has the .blog extension
 */
function ensureBlogExtension(title: string): string {
    return ensureExtension(title, BLOG_EXTENSION);
}

/**
 * Ensures a claude session title has the .claude_session extension
 */
function ensureClaudeSessionExtension(title: string): string {
    return ensureExtension(title, CLAUDE_SESSION_EXTENSION);
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

/**
 * Validates and normalizes a blog title for creation/editing
 */
export function normalizeBlogTitle(title: string): string {
    if (!title || !title.trim()) {
        return 'New Blog' + BLOG_EXTENSION;
    }
    
    const trimmed = title.trim();
    return ensureBlogExtension(trimmed);
}

/**
 * Validates and normalizes a claude session title for creation/editing
 */
export function normalizeClaudeSessionTitle(title: string): string {
    if (!title || !title.trim()) {
        return 'New Claude Session' + CLAUDE_SESSION_EXTENSION;
    }
    
    const trimmed = title.trim();
    return ensureClaudeSessionExtension(trimmed);
}