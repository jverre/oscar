/**
 * Maps Claude Code messages to AI SDK format
 */

import { AISDKMessage } from '../types.js';
import { ClaudeMessage } from './claude-types.js';
import { logger } from '../logger.js';

/**
 * Process Claude messages and convert them to AI SDK format
 */
export function processClaudeMessages(
  claudeMessages: ClaudeMessage[],
  conversationId: string
): AISDKMessage[] {
  const aiMessages: AISDKMessage[] = [];
  let messageOrder = 0;

  for (const claudeMsg of claudeMessages) {
    // Skip meta messages and messages without content
    if (claudeMsg.isMeta || !claudeMsg.message) {
      continue;
    }

    try {
      const aiMessage = mapClaudeToAISDK(claudeMsg, conversationId, messageOrder++);
      if (aiMessage) {
        aiMessages.push(aiMessage);
      }
    } catch (error) {
      logger.warn(`[Claude Mapper] Failed to map message ${claudeMsg.uuid}: ${error}`);
    }
  }

  logger.info(`[Claude Mapper] Mapped ${aiMessages.length} messages from ${claudeMessages.length} Claude messages`);
  return aiMessages;
}

/**
 * Map a single Claude message to AI SDK format
 */
function mapClaudeToAISDK(
  claudeMsg: ClaudeMessage,
  conversationId: string,
  messageOrder: number
): AISDKMessage | null {
  const { message, uuid, timestamp } = claudeMsg;
  
  if (!message) {
    return null;
  }

  // Extract content
  let content: string = '';
  
  if (typeof message.content === 'string') {
    content = message.content;
  } else if (Array.isArray(message.content)) {
    // Handle array content (common in assistant messages)
    content = message.content
      .map(part => {
        if (part.type === 'text' && part.text) {
          return part.text;
        }
        return '';
      })
      .join('');
  }

  // Skip empty messages
  if (!content.trim()) {
    return null;
  }

  // Map role
  let role: AISDKMessage['role'];
  switch (message.role) {
    case 'user':
      role = 'user';
      break;
    case 'assistant':
      role = 'assistant';
      break;
    default:
      logger.warn(`[Claude Mapper] Unknown role: ${message.role}`);
      return null;
  }

  return {
    messageId: uuid,
    role,
    content,
    timestamp: new Date(timestamp).getTime(),
    conversationId,
    messageOrder
  };
}