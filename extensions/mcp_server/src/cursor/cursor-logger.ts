/**
 * Cursor chat logging functionality
 * Background upload process for Cursor conversations
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { 
  AISDKMessage, 
  ConversationExtractResult
} from '../types.js';
import { logger } from '../logger.js';
import { processCursorMessages } from './cursor-message-mapper.js';
import { oscarClient } from '../oscar.js';

const CURSOR_USER_PATH = join(homedir(), 'Library/Application Support/Cursor/User');
const GLOBAL_STORAGE_PATH = join(CURSOR_USER_PATH, 'globalStorage/state.vscdb');

// Oscar client is imported from oscar.js


/**
 * Find conversation by polling SQLite for the oscar chat ID
 */
async function findConversationByToolResponse(oscarChatId: string): Promise<string | null> {
  if (!existsSync(GLOBAL_STORAGE_PATH)) return null;
  
  // Try immediately first (no delay)
  logger.info(`[Cursor Logger] Searching for oscar chat ID: ${oscarChatId}`);
  try {
    const db = new Database(GLOBAL_STORAGE_PATH, { readonly: true });
    const result = db.prepare(`
      SELECT substr(key, 10, 36) as conversation_id
      FROM cursorDiskKV 
      WHERE key LIKE 'bubbleId:%'
      AND value LIKE ?
      LIMIT 1
    `).get(`%${oscarChatId}%`) as { conversation_id: string } | undefined;
    db.close();
    
    if (result?.conversation_id) {
      logger.info(`[Cursor Logger] Found conversation immediately: ${result.conversation_id}`);
      return result.conversation_id;
    } else {
      logger.info(`[Cursor Logger] Not found immediately, starting polling...`);
    }
  } catch (error) {
    logger.error(`[Cursor Logger] Error in immediate search: ${error}`);
  }
  
  // If not found immediately, poll with intervals
  const maxWaitTime = 45000; // 45 seconds to allow for Cursor to save
  const pollInterval = 100; // 100ms polling interval
  const startTime = Date.now();
  
  let pollCount = 0;
  const maxPolls = Math.floor(maxWaitTime / pollInterval);
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const db = new Database(GLOBAL_STORAGE_PATH, { readonly: true });
      const result = db.prepare(`
        SELECT substr(key, 10, 36) as conversation_id
        FROM cursorDiskKV 
        WHERE key LIKE 'bubbleId:%'
        AND value LIKE ?
        LIMIT 1
      `).get(`%${oscarChatId}%`) as { conversation_id: string } | undefined;
      db.close();
      
      if (result?.conversation_id) {
        logger.info(`[Cursor Logger] Found conversation after ${pollCount} polls: ${result.conversation_id}`);
        return result.conversation_id;
      }
      
      pollCount++;
      if (pollCount % 50 === 0) { // Log every 5 seconds
        logger.info(`[Cursor Logger] Still polling... ${pollCount}/${maxPolls} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      logger.error(`[Cursor Logger] Error polling for conversation: ${error}`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
  
  logger.error(`[Cursor Logger] Timeout after ${maxWaitTime}ms waiting for conversation ${oscarChatId}`);
  return null;
}

/**
 * Step 2: Extract all messages from the conversation using proper ordering
 * Now uses schema validation and type-safe mapping
 */
function extractConversationMessages(conversationUUID: string): AISDKMessage[] {
  if (!existsSync(GLOBAL_STORAGE_PATH)) return [];
  
  try {
    const db = new Database(GLOBAL_STORAGE_PATH, { readonly: true });
    
    // First, get the ordered list of messages from composerData
    const composerData = db.prepare(`
      SELECT json_extract(value, '$.fullConversationHeadersOnly') as messageOrder
      FROM cursorDiskKV 
      WHERE key = 'composerData:' || ?
    `).get(conversationUUID) as { messageOrder: string } | undefined;
    
    if (!composerData || !composerData.messageOrder) {
      logger.error(`[Cursor Logger] No composerData found for conversation ${conversationUUID}`);
      db.close();
      return [];
    }
    
    const orderedMessages = JSON.parse(composerData.messageOrder) as Array<{
      bubbleId: string;
      type: number;
    }>;
    
    logger.info(`[Cursor Logger] Processing ${orderedMessages.length} messages for conversation ${conversationUUID}`);
    
    // Get all raw message data in order
    const rawMessages: unknown[] = [];
    
    for (const messageHeader of orderedMessages) {
      try {
        // Get the complete message data
        const rawMessage = db.prepare(`
          SELECT value
          FROM cursorDiskKV 
          WHERE key = 'bubbleId:' || ? || ':' || ?
        `).get(conversationUUID, messageHeader.bubbleId) as { value?: string } | undefined;
        
        if (rawMessage?.value) {
          // Parse the JSON value
          const parsedMessage = JSON.parse(rawMessage.value);
          rawMessages.push(parsedMessage);
        }
      } catch (e) {
        logger.warn(`[Cursor Logger] Failed to parse message ${messageHeader.bubbleId}: ${e}`);
        continue;
      }
    }
    
    db.close();
    
    // Use the new mapper to process all messages with validation
    const processedMessages = processCursorMessages(rawMessages, conversationUUID);
    
    logger.info(`[Cursor Logger] Successfully processed ${rawMessages.length} raw messages into ${processedMessages.length} AI SDK messages`);
    
    return processedMessages;
    
  } catch (error) {
    logger.error(`[Cursor Logger] Error extracting conversation messages: ${error}`);
    return [];
  }
}

/**
 * Upload extracted conversation data to Oscar API
 */
async function uploadToAPI(extractResult: ConversationExtractResult): Promise<string> {
  return await oscarClient.uploadMessages(extractResult);
}

/**
 * Upload cursor chat conversation using oscar chat ID
 */
export async function uploadCursorChat(oscarChatId: string): Promise<void> {
  logger.info(`[Cursor Logger] Starting upload for oscar chat ID: ${oscarChatId}`);
  
  // Find conversation by polling SQLite
  const conversationUUID = await findConversationByToolResponse(oscarChatId);
  
  if (!conversationUUID) {
    logger.error(`[Cursor Logger] Could not find conversation with oscar chat ID: ${oscarChatId}`);
    throw new Error(`Could not find conversation with oscar chat ID: ${oscarChatId}`);
  }
  
  logger.info(`[Cursor Logger] Found conversation UUID: ${conversationUUID}`);
  
  // Extract all messages from the conversation
  const messages = extractConversationMessages(conversationUUID);
  
  if (messages.length === 0) {
    logger.error(`[Cursor Logger] No messages found in conversation ${conversationUUID}`);
    throw new Error(`No messages found in conversation ${conversationUUID}`);
  }
  
  logger.info(`[Cursor Logger] Extracted ${messages.length} messages`);
  
  // Create result object for upload
  const extractResult: ConversationExtractResult = {
    conversationId: oscarChatId, // Use oscar chat ID as the conversation ID
    messages,
    totalMessages: messages.length
  };
  
  // Upload to Oscar API
  logger.info(`[Cursor Logger] Uploading to Oscar API with ${extractResult.totalMessages} messages`);
  const uploadResult = await uploadToAPI(extractResult);
  logger.info(`[Cursor Logger] Upload result: ${uploadResult}`);
  logger.info(`[Cursor Logger] Successfully uploaded chat ${oscarChatId}`);
}

