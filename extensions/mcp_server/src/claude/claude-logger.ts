/**
 * Claude Code conversation logging functionality
 * Background upload process for Claude conversations
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { glob } from 'glob';
import { 
  AISDKMessage, 
  ConversationExtractResult
} from '../types.js';
import { logger } from '../logger.js';
import { processClaudeMessages } from './claude-message-mapper.js';
import { ClaudeMessage } from './claude-types.js';
import { oscarClient } from '../oscar.js';

const CLAUDE_BASE_PATH = join(homedir(), '.claude/projects');

/**
 * Find conversation file containing the Oscar chat ID
 */
async function findConversationByOscarId(oscarChatId: string): Promise<string | null> {
  if (!existsSync(CLAUDE_BASE_PATH)) {
    logger.error(`[Claude Logger] Claude projects directory not found: ${CLAUDE_BASE_PATH}`);
    return null;
  }
  
  logger.info(`[Claude Logger] Searching for Oscar chat ID: ${oscarChatId}`);
  
  try {
    // Get all JSONL files in all project directories
    const pattern = join(CLAUDE_BASE_PATH, '**/*.jsonl');
    const files = glob.sync(pattern);
    
    logger.info(`[Claude Logger] Found ${files.length} conversation files to search`);
    
    // Search each file for the Oscar chat ID
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        if (content.includes(oscarChatId)) {
          logger.info(`[Claude Logger] Found conversation in file: ${file}`);
          return file;
        }
      } catch (error) {
        logger.warn(`[Claude Logger] Error reading file ${file}: ${error}`);
        continue;
      }
    }
    
    logger.error(`[Claude Logger] No conversation found containing Oscar chat ID: ${oscarChatId}`);
    return null;
    
  } catch (error) {
    logger.error(`[Claude Logger] Error searching for conversation: ${error}`);
    return null;
  }
}

/**
 * Extract all messages from a Claude conversation file
 */
function extractConversationMessages(filePath: string): AISDKMessage[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    logger.info(`[Claude Logger] Processing ${lines.length} lines from ${filePath}`);
    
    const claudeMessages: ClaudeMessage[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const message = JSON.parse(line) as ClaudeMessage;
        claudeMessages.push(message);
      } catch (error) {
        logger.warn(`[Claude Logger] Failed to parse line: ${error}`);
        continue;
      }
    }
    
    // Extract session ID from first message
    const sessionId = claudeMessages[0]?.sessionId || 'unknown';
    
    logger.info(`[Claude Logger] Parsed ${claudeMessages.length} Claude messages for session ${sessionId}`);
    
    // Convert to AI SDK format
    const aiMessages = processClaudeMessages(claudeMessages, sessionId);
    
    return aiMessages;
    
  } catch (error) {
    logger.error(`[Claude Logger] Error extracting conversation messages: ${error}`);
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
 * Upload Claude conversation using Oscar chat ID
 */
export async function uploadClaudeChat(oscarChatId: string): Promise<void> {
  logger.info(`[Claude Logger] Starting upload for Oscar chat ID: ${oscarChatId}`);
  
  // Find conversation file by searching for Oscar chat ID
  const conversationFile = await findConversationByOscarId(oscarChatId);
  
  if (!conversationFile) {
    logger.error(`[Claude Logger] Could not find conversation with Oscar chat ID: ${oscarChatId}`);
    throw new Error(`Could not find conversation with Oscar chat ID: ${oscarChatId}`);
  }
  
  logger.info(`[Claude Logger] Found conversation file: ${conversationFile}`);
  
  // Extract all messages from the conversation
  const messages = extractConversationMessages(conversationFile);
  
  if (messages.length === 0) {
    logger.error(`[Claude Logger] No messages found in conversation file ${conversationFile}`);
    throw new Error(`No messages found in conversation file ${conversationFile}`);
  }
  
  logger.info(`[Claude Logger] Extracted ${messages.length} messages`);
  
  // Create result object for upload
  const extractResult: ConversationExtractResult = {
    conversationId: oscarChatId, // Use Oscar chat ID as the conversation ID
    messages,
    totalMessages: messages.length
  };
  
  // Upload to Oscar API
  logger.info(`[Claude Logger] Uploading to Oscar API with ${extractResult.totalMessages} messages`);
  const uploadResult = await uploadToAPI(extractResult);
  logger.info(`[Claude Logger] Upload result: ${uploadResult}`);
  logger.info(`[Claude Logger] Successfully uploaded chat ${oscarChatId}`);
}