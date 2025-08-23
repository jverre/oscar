/**
 * General AI SDK compatible types
 */

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: any; // JSON-serializable object
}

// AI SDK LanguageModelV2ToolResultOutput types
export type LanguageModelV2ToolResultOutput =
  | { type: 'text'; value: string }
  | { type: 'json'; value: any } // JSONValue
  | { type: 'error-text'; value: string }
  | { type: 'error-json'; value: any } // JSONValue
  | {
      type: 'content';
      value: Array<
        | {
            type: 'text';
            text: string;
          }
        | {
            type: 'media';
            data: string; // Base-64 encoded media data
            mediaType: string; // IANA media type
          }
      >;
    };

export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  output: LanguageModelV2ToolResultOutput; // Required: Result of the tool call
  providerOptions?: any; // Optional: Additional provider-specific metadata
}

export type UserContent = string | Array<TextPart>;
export type AssistantContent = string | Array<TextPart | ToolCallPart>;
export type ToolContent = Array<ToolResultPart>;

export interface AISDKMessage {
  messageId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | UserContent | AssistantContent | ToolContent;
  timestamp?: number;
  conversationId?: string;
  messageOrder: number;
}

export interface ConversationExtractResult {
  conversationId: string;
  messages: AISDKMessage[];
  totalMessages: number;
}

export interface UploadJob {
  oscarChatId: string;
  platform: string;
  timestamp: number;
}

export enum UploadStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}