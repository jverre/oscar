import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { getToolsForAI, ToolContext, systemPrompt } from './tools';

// Create OpenRouter provider instance
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Store active abort controllers for cancellation
const activeGenerations = new Map<string, AbortController>();

export const generateChatResponse = internalAction({
  args: {
    messages: v.array(v.any()),
    pluginId: v.string(),
    assistantMessageId: v.string(),
    toolContext: v.object({
      sandboxId: v.optional(v.string()),
      pluginId: v.optional(v.string()),
      organizationId: v.optional(v.string()),
      modalAuthToken: v.optional(v.string()),
      convexUrl: v.optional(v.string()),
      authToken: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Create abort controller for this generation
    const abortController = new AbortController();
    activeGenerations.set(args.assistantMessageId, abortController);
    
    try {
      // Update status to streaming
      await ctx.runMutation(internal.chats.updateMessageStatus, {
        pluginId: args.pluginId,
        messageId: args.assistantMessageId,
        status: "streaming",
      });

      // Generate AI response
      const aiTools = getToolsForAI(args.toolContext);

      // Add system message at the beginning
      const systemMessage = {
        role: 'system' as const,
        parts: [{ type: 'text', text: systemPrompt }]
      };
      const messagesWithSystem = [systemMessage, ...args.messages];
      
      // Convert UI messages to model format for AI SDK v5
      const modelMessages = convertToModelMessages(messagesWithSystem);
      
      // Fix duplicate IDs by removing ID from duplicates
      const seenIds = new Set();
      const cleanedMessages = modelMessages.map(msg => {
        if ('id' in msg && msg.id && seenIds.has(msg.id)) {
          const { id, ...msgWithoutId } = msg;
          return msgWithoutId;
        }
        if ('id' in msg && msg.id) {
          seenIds.add(msg.id);
        }
        return msg;
      });

      // Call with tools enabled
      const result = await streamText({
        model: openrouter.chat('anthropic/claude-sonnet-4'),
        messages: cleanedMessages,
        tools: aiTools,
        toolChoice: 'auto',
        stopWhen: stepCountIs(50),
        abortSignal: abortController.signal,
      });
      
      // Stream the response and build parts in correct order
      let currentText = '';
      let parts: any[] = [];
      let updateCounter = 0;
      
      // Process the full stream to capture both text and tool calls in order
      let chunkCounter = 0;
      for await (const chunk of result.fullStream) {
        // Check message status periodically
        if (chunkCounter++ % 10 === 0) {
          const message = await ctx.runQuery(internal.chats.getMessageStatus, {
            pluginId: args.pluginId,
            messageId: args.assistantMessageId,
          });
          
          if (message?.status === 'cancelled') {
            abortController.abort();
            break;
          }
        }
        if (chunk.type === 'text-delta') {
          currentText += chunk.text;
          updateCounter++;
          
          // Update streaming content for real-time display
          if (updateCounter % 3 === 0 || chunk.text.includes('.') || chunk.text.includes('!') || chunk.text.includes('?')) {
            await ctx.runMutation(internal.chats.updateStreamingContent, {
              pluginId: args.pluginId,
              messageId: args.assistantMessageId,
              content: currentText,
            });
          }
        } else if (chunk.type === 'tool-call') {
          // Save any preceding text as a text part
          if (currentText.trim()) {
            parts.push({ type: 'text', text: currentText });
            currentText = ''; // Reset for next text segment
          }
          
          // Add tool call part
          const toolCall = {
            type: `tool-${chunk.toolName}`,
            state: 'input-available',
            input: chunk.input,
          };
          parts.push(toolCall);
          
          // Update message with current parts so tool call shows immediately
          const currentMessage = {
            id: args.assistantMessageId,
            role: 'assistant' as const,
            content: parts.filter(p => p.type === 'text').map(p => p.text).join(''),
            parts: [...parts],
          };
          
          await ctx.runMutation(internal.chats.finalizeMessage, {
            pluginId: args.pluginId,
            messageId: args.assistantMessageId,
            aiSDKMessage: currentMessage,
            status: "streaming",
          });
        } else if (chunk.type === 'tool-result') {
          // Update the last tool call with results
          const lastToolIndex = parts.length - 1;
          if (lastToolIndex >= 0 && parts[lastToolIndex].type === `tool-${chunk.toolName}`) {
            parts[lastToolIndex] = {
              ...parts[lastToolIndex],
              state: 'output-available',
              output: chunk.output,
            };
          }
          
          // Update message with tool result so it shows immediately
          const currentMessage = {
            id: args.assistantMessageId,
            role: 'assistant' as const,
            content: parts.filter(p => p.type === 'text').map(p => p.text).join(''),
            parts: [...parts],
          };
          
          await ctx.runMutation(internal.chats.finalizeMessage, {
            pluginId: args.pluginId,
            messageId: args.assistantMessageId,
            aiSDKMessage: currentMessage,
            status: "streaming",
          });
        }
      }
      
      // Add any remaining text as final text part
      if (currentText.trim()) {
        parts.push({ type: 'text', text: currentText });
      }
      
      // Build full content for fallback
      const fullContent = parts
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('');
      
      const finalMessage = {
        id: args.assistantMessageId,
        role: 'assistant' as const,
        content: fullContent,
        parts: parts,
      };
      
      // Save the final complete message
      await ctx.runMutation(internal.chats.finalizeMessage, {
        pluginId: args.pluginId,
        messageId: args.assistantMessageId,
        aiSDKMessage: finalMessage,
        status: "complete",
      });

    } catch (error) {
      // Check if this was an abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat generation cancelled:', args.assistantMessageId);
        // Status is already set to cancelled by stopStreaming mutation
      } else {
        console.error('Error in chat generation:', error);
        
        // Update status to error
        await ctx.runMutation(internal.chats.updateMessageStatus, {
          pluginId: args.pluginId,
          messageId: args.assistantMessageId,
          status: "error",
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    } finally {
      // Clean up abort controller
      activeGenerations.delete(args.assistantMessageId);
    }
  },
});