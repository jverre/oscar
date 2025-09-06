/**
 * Type definitions for Claude Code conversation format
 */

export interface ClaudeToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: any;
}

export interface ClaudeToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export interface ClaudeTextContent {
  type: 'text';
  text: string;
}

export type ClaudeContentPart = ClaudeTextContent | ClaudeToolUse | ClaudeToolResult;

export interface ClaudeMessage {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  gitBranch?: string;
  type: 'user' | 'assistant';
  message?: {
    role: 'user' | 'assistant';
    content: string | Array<ClaudeContentPart>;
    id?: string;
    model?: string;
    stop_reason?: string | null;
    stop_sequence?: string | null;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      [key: string]: any;
    };
  };
  isMeta?: boolean;
  uuid: string;
  timestamp: string;
  requestId?: string;
  toolUseResult?: any;
}

export interface ClaudeConversation {
  filePath: string;
  messages: ClaudeMessage[];
  sessionId: string;
}