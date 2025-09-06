/**
 * Maps Claude Code messages to AI SDK format
 */

import { AISDKMessage, TextPart, ToolCallPart, ToolResultPart, AssistantContent, ToolContent, UserContent } from '../types.js';
import { ClaudeMessage, ClaudeContentPart, ClaudeToolUse, ClaudeToolResult, ClaudeTextContent } from './claude-types.js';
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

  // Group tool results with their parent messages
  const toolResultMap = new Map<string, ClaudeMessage>();
  
  // First pass: collect tool results
  for (const claudeMsg of claudeMessages) {
    if (claudeMsg.type === 'user' && claudeMsg.message?.content && Array.isArray(claudeMsg.message.content)) {
      for (const part of claudeMsg.message.content) {
        if (part.type === 'tool_result') {
          const toolResult = part as ClaudeToolResult;
          toolResultMap.set(toolResult.tool_use_id, claudeMsg);
        }
      }
    }
  }

  // Second pass: process messages
  for (const claudeMsg of claudeMessages) {
    // Skip meta messages and messages without content
    if (claudeMsg.isMeta || !claudeMsg.message) {
      continue;
    }

    // Skip tool result messages as they'll be processed with their parent assistant messages
    if (claudeMsg.type === 'user' && claudeMsg.message?.content && Array.isArray(claudeMsg.message.content)) {
      const hasToolResult = claudeMsg.message.content.some(part => part.type === 'tool_result');
      if (hasToolResult) {
        continue;
      }
    }

    try {
      const aiMessage = mapClaudeToAISDK(claudeMsg, conversationId, messageOrder++, toolResultMap);
      if (aiMessage) {
        aiMessages.push(aiMessage);
        
        // If this assistant message has tool calls, create corresponding tool result messages
        if (aiMessage.role === 'assistant' && Array.isArray(aiMessage.content)) {
          const toolCalls = aiMessage.content.filter((part): part is ToolCallPart => part.type === 'tool-call');
          
          for (const toolCall of toolCalls) {
            const toolResultMsg = toolResultMap.get(toolCall.toolCallId);
            if (toolResultMsg) {
              const toolMessage = createToolResultMessage(toolResultMsg, conversationId, messageOrder++, toolCall.toolCallId);
              if (toolMessage) {
                aiMessages.push(toolMessage);
              }
            }
          }
        }
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
  messageOrder: number,
  toolResultMap: Map<string, ClaudeMessage>
): AISDKMessage | null {
  const { message, uuid, timestamp } = claudeMsg;
  
  if (!message) {
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

  // Process content
  let content: UserContent | AssistantContent;

  if (typeof message.content === 'string') {
    content = message.content;
  } else if (Array.isArray(message.content)) {
    const processedParts: (TextPart | ToolCallPart)[] = [];
    
    for (const part of message.content) {
      if (part.type === 'text') {
        const textPart = part as ClaudeTextContent;
        if (textPart.text && textPart.text.trim()) {
          processedParts.push({
            type: 'text',
            text: textPart.text
          });
        }
      } else if (part.type === 'tool_use') {
        const toolUse = part as ClaudeToolUse;
        processedParts.push({
          type: 'tool-call',
          toolCallId: toolUse.id,
          toolName: toolUse.name,
          args: toolUse.input
        });
      }
    }

    // If we only have empty content, skip this message
    if (processedParts.length === 0) {
      return null;
    }

    // If there's only one text part, use string format for simplicity
    if (processedParts.length === 1 && processedParts[0].type === 'text') {
      content = processedParts[0].text;
    } else {
      content = processedParts;
    }
  } else {
    logger.warn(`[Claude Mapper] Unknown content type: ${typeof message.content}`);
    return null;
  }

  // Skip messages with empty content
  if (typeof content === 'string' && !content.trim()) {
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

/**
 * Create a tool result message from Claude tool result data
 */
function createToolResultMessage(
  toolResultMsg: ClaudeMessage,
  conversationId: string,
  messageOrder: number,
  toolCallId: string
): AISDKMessage | null {
  if (!toolResultMsg.message?.content || !Array.isArray(toolResultMsg.message.content)) {
    return null;
  }

  const toolResultParts: ToolResultPart[] = [];
  
  for (const part of toolResultMsg.message.content) {
    if (part.type === 'tool_result') {
      const toolResult = part as ClaudeToolResult;
      if (toolResult.tool_use_id === toolCallId) {
        // Extract the text content from the tool result
        let resultText = '';
        if (toolResult.content && Array.isArray(toolResult.content)) {
          resultText = toolResult.content
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join('');
        }

        // Check if we have toolUseResult in the claudeMsg for richer data
        let output: any = { type: 'text', value: resultText };
        if (toolResultMsg.toolUseResult) {
          // Use the richer toolUseResult data if available
          if (typeof toolResultMsg.toolUseResult === 'string') {
            output = { type: 'text', value: toolResultMsg.toolUseResult };
          } else {
            output = { type: 'json', value: toolResultMsg.toolUseResult };
          }
        }

        toolResultParts.push({
          type: 'tool-result',
          toolCallId: toolResult.tool_use_id,
          toolName: '', // We don't have the tool name in the result, it will be inferred
          output
        });
      }
    }
  }

  if (toolResultParts.length === 0) {
    return null;
  }

  return {
    messageId: `${toolResultMsg.uuid}-tool-result`,
    role: 'tool',
    content: toolResultParts,
    timestamp: new Date(toolResultMsg.timestamp).getTime(),
    conversationId,
    messageOrder
  };
}