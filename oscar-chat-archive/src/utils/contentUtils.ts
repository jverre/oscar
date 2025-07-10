// Utility functions for handling structured content safely

export type ContentPart = {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  args?: any;
  result?: any;
  isError?: boolean;
};

export type StructuredContent = ContentPart[];

/**
 * Safely normalizes content to structured format
 */
export function normalizeContent(content: any): StructuredContent {
  // If already a valid array, return as-is
  if (Array.isArray(content)) {
    return content.map(part => normalizeContentPart(part));
  }
  
  // If it's a string, convert to text part
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  
  // If it's null/undefined, return empty text
  if (content == null) {
    return [{ type: 'text', text: '' }];
  }
  
  // For any other type, stringify it
  return [{ type: 'text', text: JSON.stringify(content) }];
}

/**
 * Safely normalizes a single content part
 */
function normalizeContentPart(part: any): ContentPart {
  if (typeof part !== 'object' || part === null) {
    return { type: 'text', text: String(part) };
  }
  
  const normalizedPart: ContentPart = {
    type: part.type || 'text'
  };
  
  // Add type-specific properties
  if (part.type === 'text') {
    normalizedPart.text = String(part.text || '');
  } else if (part.type === 'tool-call') {
    normalizedPart.toolCallId = String(part.toolCallId || '');
    normalizedPart.toolName = String(part.toolName || '');
    normalizedPart.args = part.args;
  } else if (part.type === 'tool-result') {
    normalizedPart.toolCallId = String(part.toolCallId || '');
    normalizedPart.result = part.result;
    normalizedPart.isError = Boolean(part.isError);
  } else {
    // Unknown type, convert to text
    normalizedPart.type = 'text';
    normalizedPart.text = JSON.stringify(part);
  }
  
  return normalizedPart;
}

/**
 * Extracts text content from structured content
 */
export function extractTextContent(content: any): string {
  const normalized = normalizeContent(content);
  return normalized
    .filter(part => part.type === 'text')
    .map(part => part.text || '')
    .join(' ')
    .trim();
}

/**
 * Checks if content has tool calls
 */
export function hasToolCalls(content: any): boolean {
  const normalized = normalizeContent(content);
  return normalized.some(part => part.type === 'tool-call' || part.type === 'tool-result');
}

/**
 * Creates a preview of content for display (max 100 chars)
 */
export function createContentPreview(content: any, maxLength: number = 100): string {
  const textContent = extractTextContent(content);
  const hasTools = hasToolCalls(content);
  
  if (!textContent && hasTools) {
    return '[Message with tool calls]';
  }
  
  if (textContent.length <= maxLength) {
    return textContent;
  }
  
  return textContent.substring(0, maxLength - 3) + '...';
}