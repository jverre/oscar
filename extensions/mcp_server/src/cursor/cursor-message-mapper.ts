/**
 * Cursor message mapper - converts Cursor messages to AI SDK format
 * Handles validation, parsing, and transformation of all message types
 */

import { 
  CursorMessage, 
  CursorUserMessage, 
  CursorAssistantMessage, 
  CursorToolFormerData,
  cursorMessageSchema,
  isCursorToolComplete,
  isCursorToolError,
  isCursorUserMessage,
  isCursorAssistantMessage
} from './cursor-types.js';

import { 
  AISDKMessage, 
  ToolCallPart, 
  AssistantContent, 
  ToolContent 
} from '../types.js';

import { logger } from '../logger.js';

// ========== Validation ==========

/**
 * Validates and parses a raw Cursor message from the database
 */
export function validateCursorMessage(rawMessage: unknown): CursorMessage | null {
  const parseResult = cursorMessageSchema.safeParse(rawMessage);
  
  if (!parseResult.success) {
    logger.error(`[Cursor Mapper] Invalid message structure: ${parseResult.error.message}`);
    logger.error(`[Cursor Mapper] Raw message: ${JSON.stringify(rawMessage)}`);
    return null;
  }
  
  return parseResult.data;
}

// ========== Content Parsers ==========

/**
 * Parses Lexical richText JSON format to extract plain text and structure
 */
function parseRichText(richText: string): { text: string; hasStructure: boolean } {
  try {
    const parsed = JSON.parse(richText);
    
    // Extract text from Lexical format
    const extractText = (node: any): string => {
      if (typeof node === 'string') return node;
      if (!node || typeof node !== 'object') return '';
      
      if (node.text) return node.text;
      
      if (node.children && Array.isArray(node.children)) {
        return node.children.map(extractText).join('');
      }
      
      return '';
    };
    
    const text = extractText(parsed);
    const hasStructure = richText.includes('paragraph') || richText.includes('heading');
    
    return { text, hasStructure };
  } catch (e) {
    logger.error(`[Cursor Mapper] Failed to parse richText: ${e} | richText: ${richText}`);
    return { text: '', hasStructure: false };
  }
}

/**
 * Safely parses JSON string with error handling
 */
function safeJsonParse(jsonString: string, fieldName: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    logger.error(`[Cursor Mapper] Failed to parse ${fieldName}: ${e} | JSON: ${jsonString}`);
    return null;
  }
}

// ========== Message Converters ==========

/**
 * Converts a Cursor user message to AI SDK format
 */
export function convertCursorUserMessage(
  cursorMessage: CursorUserMessage, 
  messageOrder: number,
  conversationId: string
): AISDKMessage {
  
  // Use text field primarily, fall back to richText if needed
  let content: string = cursorMessage.text;
  
  // If text is empty but richText exists, extract from richText
  if (!content && cursorMessage.richText) {
    const { text } = parseRichText(cursorMessage.richText);
    content = text;
  }
  
  // User messages now use consistent array format
  // Future enhancement: could parse richText into structured content parts
  
  return {
    messageId: cursorMessage.bubbleId,
    role: 'user',
    content: [{
      type: 'text',
      text: content
    }],
    conversationId,
    messageOrder,
    timestamp: cursorMessage.timingInfo?.clientStartTime
  };
}

/**
 * Converts a Cursor assistant message to AI SDK format
 * Returns array of messages (assistant + optional tool result)
 */
export function convertCursorAssistantMessage(
  cursorMessage: CursorAssistantMessage,
  baseMessageOrder: number,
  conversationId: string
): AISDKMessage[] {
  
  const messages: AISDKMessage[] = [];
  
  // Create assistant message content
  const content: AssistantContent = [];
  
  // Add text content if present
  if (cursorMessage.text && cursorMessage.text.trim() !== '') {
    content.push({
      type: 'text',
      text: cursorMessage.text
    });
  }
  
  // Handle tool calls
  if (cursorMessage.toolFormerData) {
    if (isCursorToolComplete(cursorMessage.toolFormerData)) {
      const toolData = cursorMessage.toolFormerData;
      
      // Parse tool arguments
      const args = safeJsonParse(toolData.rawArgs, 'rawArgs');
      if (args !== null) {
        const toolCallPart: ToolCallPart = {
          type: 'tool-call',
          toolCallId: toolData.toolCallId,
          toolName: toolData.name,
          args
        };
        content.push(toolCallPart);
        
        logger.debug(`[Cursor Mapper] Added tool call: ${toolData.name}`);
      }
    } else if (isCursorToolError(cursorMessage.toolFormerData)) {
      // For tool errors, we still need to create a tool call if we have basic info
      // Even errors might have been attempted tool calls
      logger.debug(`[Cursor Mapper] Found tool error in message ${cursorMessage.bubbleId}`);
      
      // Try to extract any tool call info from the error
      // Tool errors typically don't have complete tool data, so we'll handle them as text-only messages
      // The actual error will be in the text content
    }
  }
  
  // Add assistant message if it has content
  if (content.length > 0) {
    const assistantMessage: AISDKMessage = {
      messageId: cursorMessage.bubbleId,
      role: 'assistant',
      content: content,
      conversationId,
      messageOrder: baseMessageOrder,
      timestamp: cursorMessage.timingInfo?.clientStartTime
    };
    
    messages.push(assistantMessage);
  }
  
  // Add separate tool result message if tool completed with result
  if (cursorMessage.toolFormerData && isCursorToolComplete(cursorMessage.toolFormerData)) {
    const toolData = cursorMessage.toolFormerData;
    
    if (toolData.result) {
      const result = safeJsonParse(toolData.result, 'result');
      if (result !== null) {
        const toolResultContent: ToolContent = [{
          type: 'tool-result',
          toolCallId: toolData.toolCallId,
          toolName: toolData.name,
          output: {
            type: 'json',
            value: result
          }
        }];
        
        const toolMessage: AISDKMessage = {
          messageId: `${cursorMessage.bubbleId}-tool-result`,
          role: 'tool',
          content: toolResultContent,
          conversationId,
          messageOrder: baseMessageOrder + 1,
          timestamp: cursorMessage.timingInfo?.clientEndTime || cursorMessage.timingInfo?.clientStartTime
        };
        
        messages.push(toolMessage);
        logger.debug(`[Cursor Mapper] Added tool result for: ${toolData.name}`);
      }
    }
  }
  
  return messages;
}

// ========== Main Conversion Function ==========

/**
 * Converts a validated Cursor message to AI SDK format
 * Returns array of messages (some Cursor messages become multiple AI SDK messages)
 */
export function convertCursorMessage(
  cursorMessage: CursorMessage,
  baseMessageOrder: number,
  conversationId: string
): AISDKMessage[] {
  
  try {
    if (isCursorUserMessage(cursorMessage)) {
      return [convertCursorUserMessage(cursorMessage, baseMessageOrder, conversationId)];
    } else if (isCursorAssistantMessage(cursorMessage)) {
      return convertCursorAssistantMessage(cursorMessage, baseMessageOrder, conversationId);
    } else {
      logger.warn(`[Cursor Mapper] Unknown message type for ${(cursorMessage as any).bubbleId || 'unknown'}`);
      return [];
    }
  } catch (error) {
    logger.error(`[Cursor Mapper] Error converting message ${(cursorMessage as any).bubbleId || 'unknown'}: ${error}`);
    return [];
  }
}

// ========== Batch Processing ==========

/**
 * Processes a raw Cursor message from the database
 * Validates, converts, and returns AI SDK messages
 */
export function processCursorMessage(
  rawMessage: unknown,
  baseMessageOrder: number,
  conversationId: string
): { messages: AISDKMessage[]; nextOrder: number } {
  
  // Validate the message
  const validatedMessage = validateCursorMessage(rawMessage);
  if (!validatedMessage) {
    return { messages: [], nextOrder: baseMessageOrder };
  }
  
  // Convert to AI SDK format
  const convertedMessages = convertCursorMessage(validatedMessage, baseMessageOrder, conversationId);
  
  // Calculate next message order (some messages create multiple AI SDK messages)
  const nextOrder = baseMessageOrder + convertedMessages.length;
  
  return { messages: convertedMessages, nextOrder };
}

/**
 * Processes multiple raw Cursor messages in order
 */
export function processCursorMessages(
  rawMessages: unknown[],
  conversationId: string
): AISDKMessage[] {
  
  const allMessages: AISDKMessage[] = [];
  let currentOrder = 0;
  
  for (const rawMessage of rawMessages) {
    const { messages, nextOrder } = processCursorMessage(rawMessage, currentOrder, conversationId);
    allMessages.push(...messages);
    currentOrder = nextOrder;
  }
  
  logger.info(`[Cursor Mapper] Processed ${rawMessages.length} raw messages into ${allMessages.length} AI SDK messages`);
  
  return allMessages;
}