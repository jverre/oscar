import * as vscode from 'vscode';
import { OscarApiClient, ClaudeCodeLogEntry, ClaudeCodeBatchLogRequest } from './apiClient';
import { ClaudeSessionParser, ParsedClaudeSession, ParsedClaudeMessage } from '../claude/parser';
import { SyncStateManager } from '../claude/syncState';
import { ClaudeFileWatcher } from '../claude/fileWatcher';
import * as fs from 'fs';

export interface SyncResult {
    success: boolean;
    sessionId: string;
    fileId?: string;
    messagesSynced: number;
    error?: string;
}

export class OscarSyncService {
    private apiClient: OscarApiClient;
    private syncStateManager: SyncStateManager;
    private fileWatcher: ClaudeFileWatcher;
    private context: vscode.ExtensionContext;
    private isInitialized = false;

    constructor(
        context: vscode.ExtensionContext,
        syncStateManager: SyncStateManager,
        fileWatcher: ClaudeFileWatcher
    ) {
        this.context = context;
        this.syncStateManager = syncStateManager;
        this.fileWatcher = fileWatcher;
        this.apiClient = new OscarApiClient();
    }

    public async initialize(): Promise<boolean> {
        console.log('🔧 Initializing Oscar sync service...');
        
        const success = await this.apiClient.initialize();
        if (success) {
            this.isInitialized = true;
            console.log('✅ Oscar sync service initialized successfully');
        } else {
            console.log('❌ Failed to initialize Oscar sync service');
        }
        
        return success;
    }

    public async syncSession(sessionId: string): Promise<SyncResult> {
        const startTime = Date.now();
        console.log(`🚀 Starting sync for session ${sessionId}...`);
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.apiClient.isAuthenticated()) {
            const duration = Date.now() - startTime;
            console.log(`❌ Sync failed for ${sessionId} (${duration}ms): Not authenticated`);
            return {
                success: false,
                sessionId,
                messagesSynced: 0,
                error: 'Not authenticated with Oscar'
            };
        }

        try {
            // Get session data from file watcher
            const claudeSession = this.fileWatcher.getSession(sessionId);
            if (!claudeSession) {
                throw new Error(`Claude session ${sessionId} not found`);
            }

            console.log(`📄 Syncing session ${sessionId}:`);
            console.log(`   📁 Project: ${claudeSession.projectPath}`);
            console.log(`   📄 File: ${claudeSession.filePath}`);
            console.log(`   📊 Messages: ${claudeSession.messageCount}`);
            console.log(`   🕒 Last modified: ${new Date(claudeSession.lastModified).toISOString()}`);

            // Parse session messages
            const fileContent = fs.readFileSync(claudeSession.filePath, 'utf8');
            const parsedSession = ClaudeSessionParser.parseSession(sessionId, fileContent);

            console.log(`   🔍 Parsed ${parsedSession.messages.length} messages from session file`);

            // Build message thread for proper parent relationships
            const messageThreads = ClaudeSessionParser.buildMessageThread(parsedSession.messages);
            const sortedMessages = messageThreads.flat().sort((a, b) => 
                a.timestamp.getTime() - b.timestamp.getTime()
            );

            console.log(`   🧵 Built message threads: ${messageThreads.length} threads, ${sortedMessages.length} total messages`);

            // Create Claude Code log entries
            const entries = this.buildClaudeCodeEntries(sortedMessages);

            // Log entry statistics
            const userMessages = entries.filter(e => e.role === 'user').length;
            const assistantMessages = entries.filter(e => e.role === 'assistant').length;
            const toolUseMessages = entries.filter(e => e.metadata.isToolUse).length;
            const toolCallMessages = entries.filter(e => e.metadata.toolCallId).length;
            const toolResultMessages = entries.filter(e => e.metadata.toolResultId).length;
            const modelsUsed = [...new Set(entries.map(e => e.metadata.claudeOriginal?.model).filter(Boolean))];

            console.log(`   📋 Log entries prepared:`);
            console.log(`      👤 User messages: ${userMessages}`);
            console.log(`      🤖 Assistant messages: ${assistantMessages}`);
            console.log(`      🔧 Tool use messages: ${toolUseMessages}`);
            console.log(`      📞 Tool call messages: ${toolCallMessages}`);
            console.log(`      📤 Tool result messages: ${toolResultMessages}`);
            console.log(`      🧠 Models used: ${modelsUsed.join(', ') || 'Unknown'}`);

            // Create batch log request
            const batchRequest: ClaudeCodeBatchLogRequest = {
                sessionId: parsedSession.sessionId,
                entries
            };

            // Upload everything in one batch
            console.log(`   📤 Uploading ${entries.length} entries to Oscar...`);
            const uploadStartTime = Date.now();
            const result = await this.apiClient.claudeCodeBatchLog(batchRequest);
            const uploadDuration = Date.now() - uploadStartTime;

            console.log(`   ✅ Upload completed in ${uploadDuration}ms:`);
            console.log(`      📁 File ID: ${result.fileId}`);
            console.log(`      📝 Messages created: ${result.messagesCreated}`);

            // Update sync state
            await this.syncStateManager.markSessionSynced(
                sessionId,
                parsedSession.messages.length,
                claudeSession.filePath,
                claudeSession.lastModified,
                result.fileId
            );

            const totalDuration = Date.now() - startTime;
            console.log(`✅ Sync completed for ${sessionId} in ${totalDuration}ms (${result.messagesCreated} messages)`);

            return {
                success: true,
                sessionId,
                fileId: result.fileId,
                messagesSynced: result.messagesCreated
            };

        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            console.log(`❌ Sync failed for ${sessionId} (${duration}ms): ${errorMessage}`);
            
            await this.syncStateManager.markSessionError(
                sessionId,
                errorMessage
            );

            return {
                success: false,
                sessionId,
                messagesSynced: 0,
                error: errorMessage
            };
        }
    }



    private buildClaudeCodeEntries(messages: ParsedClaudeMessage[]): ClaudeCodeLogEntry[] {
        const entries: ClaudeCodeLogEntry[] = [];

        for (const message of messages) {
            // Extract tool IDs from content if present
            const toolCallId = this.extractToolCallId(message.content);
            const toolResultId = this.extractToolResultId(message.content);
            
            const entry: ClaudeCodeLogEntry = {
                role: message.role,
                content: message.content,
                metadata: {
                    claudeUuid: message.uuid,
                    claudeTimestamp: message.timestamp.toISOString(),
                    claudeType: message.role,
                    isToolUse: message.toolUses && message.toolUses.length > 0,
                    toolName: message.toolUses?.[0]?.name,
                    toolUseId: message.toolUses?.[0]?.id,
                    // Add extracted tool IDs to metadata
                    toolCallId: toolCallId,
                    toolResultId: toolResultId,
                    claudeOriginal: {
                        uuid: message.uuid,
                        parentUuid: message.parentUuid,
                        requestId: message.requestId,
                        model: message.model,
                        toolUses: message.toolUses,
                        tokenCount: message.metadata?.tokenCount,
                        latency: message.metadata?.latency,
                        error: message.metadata?.error
                    }
                }
            };

            entries.push(entry);
        }

        return entries;
    }

    private extractToolCallId(content: string): string | undefined {
        // Extract ID from tool-call pattern: :::tool-call{name="..." id="..."}
        const toolCallMatch = content.match(/:::tool-call\{[^}]*id="([^"]+)"/);
        return toolCallMatch?.[1];
    }

    private extractToolResultId(content: string): string | undefined {
        // Extract ID from tool-result pattern: :::tool-result{id="..."}
        const toolResultMatch = content.match(/:::tool-result\{id="([^"]+)"/);
        return toolResultMatch?.[1];
    }

    private mapProvider(model?: string): string | undefined {
        if (!model) return undefined;
        
        if (model.includes('claude') || model.includes('anthropic')) {
            return 'anthropic';
        } else if (model.includes('gpt') || model.includes('openai')) {
            return 'openai';
        } else if (model.includes('gemini') || model.includes('google')) {
            return 'google';
        }
        
        return undefined;
    }


    public async syncPendingSessions(): Promise<SyncResult[]> {
        const startTime = Date.now();
        console.log('🔄 Starting batch sync of pending sessions...');
        
        const allSessions = this.fileWatcher.getSessions();
        const pendingSessions = allSessions.filter(session => {
            return this.syncStateManager.needsSync(
                session.sessionId,
                session.messageCount,
                session.lastModified
            );
        });

        console.log(`📊 Session analysis:`);
        console.log(`   📂 Total sessions found: ${allSessions.length}`);
        console.log(`   🔄 Pending sync: ${pendingSessions.length}`);
        console.log(`   ✅ Already synced: ${allSessions.length - pendingSessions.length}`);

        if (pendingSessions.length === 0) {
            console.log('✅ No pending sessions to sync');
            return [];
        }

        const results: SyncResult[] = [];
        let successCount = 0;
        let failCount = 0;
        let totalMessages = 0;
        
        for (let i = 0; i < pendingSessions.length; i++) {
            const session = pendingSessions[i];
            console.log(`📄 [${i + 1}/${pendingSessions.length}] Processing session ${session.sessionId}...`);
            
            const result = await this.syncSession(session.sessionId);
            results.push(result);
            
            if (result.success) {
                successCount++;
                totalMessages += result.messagesSynced;
            } else {
                failCount++;
            }

            // Small delay between sessions to avoid overwhelming the server
            if (i < pendingSessions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        const totalDuration = Date.now() - startTime;
        console.log(`🏁 Batch sync completed in ${totalDuration}ms:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${failCount}`);
        console.log(`   📝 Total messages synced: ${totalMessages}`);
        console.log(`   ⚡ Average time per session: ${Math.round(totalDuration / pendingSessions.length)}ms`);
        
        return results;
    }

    public isReady(): boolean {
        return this.isInitialized && this.apiClient.isAuthenticated();
    }
}