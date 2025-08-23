/**
 * Complete TypeScript definitions for Cursor message structure
 * Inferred from analyzing actual Cursor SQLite database messages
 */

import { z } from 'zod';

// ========== Base Types ==========

export interface CursorTokenCount {
  inputTokens: number;
  outputTokens: number;
}

export interface CursorTimingInfo {
  clientStartTime?: number;
  clientRpcSendTime?: number;
  clientSettleTime?: number;
  clientEndTime?: number;
}

// ========== Context Types ==========

export interface CursorFileSelection {
  uri: {
    scheme: string;
    authority: string;
    path: string;
    query: string;
    fragment: string;
    fsPath: string;
  };
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface CursorContext {
  notepads: any[];
  composers: any[];
  quotes: any[];
  selectedCommits: any[];
  selectedPullRequests: any[];
  selectedImages: any[];
  usesCodebase?: boolean;
  folderSelections: any[];
  fileSelections: CursorFileSelection[];
  terminalFiles: any[];
  selections: any[];
  terminalSelections: any[];
  selectedDocs: any[];
  externalLinks: any[];
  cursorRules: any[];
  cursorCommands?: any[];
  uiElementSelections?: any[];
  mentions: {
    [key: string]: any;
  };
}

// ========== Tool Types ==========

export interface CursorToolFormerDataError {
  additionalData: {
    status: "error";
  };
}

export interface CursorToolFormerDataComplete {
  tool: number;
  toolCallId: string;
  toolIndex: number;
  modelCallId: string;
  status: "completed";
  rawArgs: string; // JSON string
  name: string;
  params: string; // JSON string
  additionalData: Record<string, any>;
  userDecision?: "accepted" | "rejected";
  result: string; // JSON string
}

export type CursorToolFormerData = CursorToolFormerDataError | CursorToolFormerDataComplete;

// ========== Message Base ==========

export interface CursorMessageBase {
  _v: number; // Version (2 or 3)
  type: 1 | 2; // 1 = user, 2 = assistant
  bubbleId: string;
  
  // Arrays that are always present but often empty
  approximateLintErrors: any[];
  lints: any[];
  codebaseContextChunks: any[];
  commits: any[];
  pullRequests: any[];
  attachedCodeChunks: any[];
  assistantSuggestedDiffs: any[];
  gitDiffs: any[];
  interpreterResults: any[];
  images: any[];
  attachedFolders: any[];
  attachedFoldersNew: any[];
  userResponsesToSuggestedCodeBlocks: any[];
  suggestedCodeBlocks: any[];
  diffsForCompressingFiles: any[];
  relevantFiles: string[]; // File paths
  toolResults: any[];
  notepads: any[];
  capabilities: any[];
  
  // Capability status tracking
  capabilityStatuses: {
    [key: string]: any[];
  };
  
  // More arrays
  multiFileLinterErrors: any[];
  diffHistories: any[];
  recentLocationsHistory: any[];
  recentlyViewedFiles: any[];
  fileDiffTrajectories: any[];
  docsReferences: any[];
  webReferences: any[];
  aiWebSearchResults?: any[];
  attachedFoldersListDirResults: any[];
  humanChanges: any[];
  summarizedComposers: any[];
  cursorRules: any[];
  contextPieces: any[];
  editTrailContexts: any[];
  allThinkingBlocks: any[];
  diffsSinceLastApply: any[];
  deletedFiles: any[];
  supportedTools: number[];
  attachedFileCodeChunksMetadataOnly?: any[];
  consoleLogs?: any[];
  uiElementPicked?: any[];
  knowledgeItems?: any[];
  documentationSelections?: any[];
  externalLinks?: any[];
  projectLayouts?: any[];
  capabilityContexts?: any[];
  todos?: any[];
  codeBlocks?: any[];
  
  // Metadata
  isAgentic: boolean;
  existedSubsequentTerminalCommand: boolean;
  existedPreviousTerminalCommand: boolean;
  requestId?: string;
  attachedHumanChanges?: boolean;
  isRefunded?: boolean;
  useWeb?: boolean;
  unifiedMode?: number;
  tokenCount: CursorTokenCount;
  
  // Tool-related data
  toolFormerData?: CursorToolFormerData;
  
  // Optional fields that may be present
  timingInfo?: CursorTimingInfo;
  serverBubbleId?: string;
  usageUuid?: string;
  capabilityType?: number;
}

// ========== User Message ==========

export interface CursorUserMessage extends CursorMessageBase {
  type: 1;
  text: string;
  richText?: string; // JSON string containing Lexical editor format
  context?: CursorContext; // Optional since some messages might not have it
  editToolSupportsSearchAndReplace?: boolean;
  isNudge?: boolean;
  attachedFileCodeChunksUris?: string[];
  capabilitiesRan?: {
    [key: string]: number[];
  };
}

// ========== Assistant Message ==========

export interface CursorAssistantMessage extends CursorMessageBase {
  type: 2;
  text: string;
  // Assistant messages typically don't have richText or context like user messages
}

// ========== Union Type ==========

export type CursorMessage = CursorUserMessage | CursorAssistantMessage;

// ========== Zod Schemas for Runtime Validation ==========

const cursorTokenCountSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
});

const cursorTimingInfoSchema = z.object({
  clientStartTime: z.number().optional(),
  clientRpcSendTime: z.number().optional(), 
  clientSettleTime: z.number().optional(),
  clientEndTime: z.number().optional(),
});

const cursorToolFormerDataErrorSchema = z.object({
  additionalData: z.object({
    status: z.literal("error"),
  }),
});

const cursorToolFormerDataCompleteSchema = z.object({
  tool: z.number(),
  toolCallId: z.string(),
  toolIndex: z.number(),
  modelCallId: z.string(),
  status: z.literal("completed"),
  rawArgs: z.string(),
  name: z.string(),
  params: z.string(),
  additionalData: z.record(z.any()),
  userDecision: z.enum(["accepted", "rejected"]).optional(),
  result: z.string(),
});

const cursorToolFormerDataSchema = z.union([
  cursorToolFormerDataErrorSchema,
  cursorToolFormerDataCompleteSchema
]);

const cursorMessageBaseSchema = z.object({
  _v: z.number(),
  type: z.union([z.literal(1), z.literal(2)]),
  bubbleId: z.string(),
  
  // Arrays
  approximateLintErrors: z.array(z.any()),
  lints: z.array(z.any()),
  codebaseContextChunks: z.array(z.any()),
  commits: z.array(z.any()),
  pullRequests: z.array(z.any()),
  attachedCodeChunks: z.array(z.any()),
  assistantSuggestedDiffs: z.array(z.any()),
  gitDiffs: z.array(z.any()),
  interpreterResults: z.array(z.any()),
  images: z.array(z.any()),
  attachedFolders: z.array(z.any()),
  attachedFoldersNew: z.array(z.any()),
  userResponsesToSuggestedCodeBlocks: z.array(z.any()),
  suggestedCodeBlocks: z.array(z.any()),
  diffsForCompressingFiles: z.array(z.any()),
  relevantFiles: z.array(z.string()),
  toolResults: z.array(z.any()),
  notepads: z.array(z.any()),
  capabilities: z.array(z.any()),
  capabilityStatuses: z.record(z.array(z.any())),
  multiFileLinterErrors: z.array(z.any()),
  diffHistories: z.array(z.any()),
  recentLocationsHistory: z.array(z.any()),
  recentlyViewedFiles: z.array(z.any()),
  fileDiffTrajectories: z.array(z.any()),
  docsReferences: z.array(z.any()),
  webReferences: z.array(z.any()),
  aiWebSearchResults: z.array(z.any()).optional(),
  attachedFoldersListDirResults: z.array(z.any()),
  humanChanges: z.array(z.any()),
  summarizedComposers: z.array(z.any()),
  cursorRules: z.array(z.any()),
  contextPieces: z.array(z.any()),
  editTrailContexts: z.array(z.any()),
  allThinkingBlocks: z.array(z.any()),
  diffsSinceLastApply: z.array(z.any()),
  deletedFiles: z.array(z.any()),
  supportedTools: z.array(z.number()),
  attachedFileCodeChunksMetadataOnly: z.array(z.any()).optional(),
  consoleLogs: z.array(z.any()).optional(),
  uiElementPicked: z.array(z.any()).optional(),
  knowledgeItems: z.array(z.any()).optional(),
  documentationSelections: z.array(z.any()).optional(),
  externalLinks: z.array(z.any()).optional(),
  projectLayouts: z.array(z.any()).optional(),
  capabilityContexts: z.array(z.any()).optional(),
  todos: z.array(z.any()).optional(),
  codeBlocks: z.array(z.any()).optional(),
  
  // Metadata
  isAgentic: z.boolean(),
  existedSubsequentTerminalCommand: z.boolean(),
  existedPreviousTerminalCommand: z.boolean(),
  requestId: z.string().optional(),
  attachedHumanChanges: z.boolean().optional(),
  isRefunded: z.boolean().optional(),
  useWeb: z.boolean().optional(),
  unifiedMode: z.number().optional(),
  tokenCount: cursorTokenCountSchema,
  
  // Tool data
  toolFormerData: cursorToolFormerDataSchema.optional(),
  
  // Timing
  timingInfo: cursorTimingInfoSchema.optional(),
  serverBubbleId: z.string().optional(),
  usageUuid: z.string().optional(),
  capabilityType: z.number().optional(),
});

export const cursorUserMessageSchema = cursorMessageBaseSchema.extend({
  type: z.literal(1),
  text: z.string(),
  richText: z.string().optional(),
  context: z.any().optional(), // Complex nested structure, optional
  editToolSupportsSearchAndReplace: z.boolean().optional(),
  isNudge: z.boolean().optional(),
  attachedFileCodeChunksUris: z.array(z.string()).optional(),
  capabilitiesRan: z.record(z.array(z.number())).optional(),
});

export const cursorAssistantMessageSchema = cursorMessageBaseSchema.extend({
  type: z.literal(2),
  text: z.string(),
});

export const cursorMessageSchema = z.union([
  cursorUserMessageSchema,
  cursorAssistantMessageSchema
]);

// ========== Type Helpers ==========

export function isCursorToolComplete(toolData: CursorToolFormerData): toolData is CursorToolFormerDataComplete {
  return 'status' in toolData && toolData.status === 'completed';
}

export function isCursorToolError(toolData: CursorToolFormerData): toolData is CursorToolFormerDataError {
  return 'additionalData' in toolData && toolData.additionalData.status === 'error';
}

export function isCursorUserMessage(message: CursorMessage): message is CursorUserMessage {
  return message.type === 1;
}

export function isCursorAssistantMessage(message: CursorMessage): message is CursorAssistantMessage {
  return message.type === 2;
}