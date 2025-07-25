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

            // Filter to only new messages since last sync
            const syncState = this.syncStateManager.getSessionSyncState(sessionId);
            const lastSyncedTimestamp = syncState?.lastSyncedMessageTimestamp || 0;
            const newMessages = sortedMessages.filter(msg => msg.timestamp.getTime() > lastSyncedTimestamp);
            
            console.log(`   🆕 New messages to sync: ${newMessages.length} (since ${new Date(lastSyncedTimestamp).toISOString()})`);
            
            if (newMessages.length === 0) {
                console.log(`   ✅ No new messages to sync for session ${sessionId}`);
                return {
                    success: true,
                    sessionId,
                    fileId: syncState?.oscarFileId,
                    messagesSynced: 0
                };
            }

            // Use simple session ID-based name for easier verification
            const friendlyName = `claude/${sessionId}.claude`;
            const sessionSummary = this.generateSessionSummary(parsedSession, sortedMessages);

            // Create Claude Code log entries for new messages only
            const entries = this.buildClaudeCodeEntries(newMessages);

            // Create batch log request
            const batchRequest: ClaudeCodeBatchLogRequest = {
                sessionId: parsedSession.sessionId,
                entries,
                fileName: friendlyName,
                sessionSummary: sessionSummary
            };

            // Upload everything in one batch
            console.log(`   📤 Uploading ${entries.length} entries to Oscar...`);
            const uploadStartTime = Date.now();
            const result = await this.apiClient.claudeCodeBatchLog(batchRequest);
            const uploadDuration = Date.now() - uploadStartTime;

            console.log(`   ✅ Upload completed in ${uploadDuration}ms:`);
            console.log(`      📁 File ID: ${result.fileId}`);
            console.log(`      📝 Messages created: ${result.messagesCreated}`);

            // Get the latest message timestamp from the synced messages
            const latestMessageTimestamp = newMessages.length > 0 
                ? Math.max(...newMessages.map(m => m.timestamp.getTime()))
                : lastSyncedTimestamp;

            // Update sync state with the latest message timestamp
            await this.syncStateManager.markSessionSynced(
                sessionId,
                parsedSession.messages.length,
                claudeSession.filePath,
                claudeSession.lastModified,
                latestMessageTimestamp,
                result.fileId
            );

            const totalDuration = Date.now() - startTime;
            console.log(`✅ Incremental sync completed for ${sessionId} in ${totalDuration}ms (${result.messagesCreated} new messages)`);

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
            // Preserve structured content instead of converting to string
            const structuredContent = this.normalizeToStructuredContent(message.content);
            
            const entry: ClaudeCodeLogEntry = {
                role: message.role,
                content: structuredContent, // Keep as structured content
                metadata: {
                    claudeUuid: message.uuid,
                    claudeTimestamp: message.timestamp.toISOString(),
                    claudeType: message.role,
                    isToolUse: message.toolUses && message.toolUses.length > 0,
                    toolName: message.toolUses?.[0]?.name,
                    toolUseId: message.toolUses?.[0]?.id,
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

    private normalizeToStructuredContent(content: any): any[] {
        if (typeof content === 'string') {
            return [{ type: 'text', text: content }];
        }
        
        if (Array.isArray(content)) {
            // Already structured content, just validate and normalize
            return content.map(part => {
                if (!part || typeof part !== 'object') {
                    return { type: 'text', text: String(part || '') };
                }
                
                switch (part.type) {
                    case 'text':
                        return {
                            type: 'text',
                            text: part.text || ''
                        };
                    case 'tool-call':
                        return {
                            type: 'tool-call',
                            toolCallId: part.toolCallId || part.id || `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                            toolName: part.toolName || part.name || 'unknown',
                            args: part.args || part.input || {}
                        };
                    case 'tool-result':
                        return {
                            type: 'tool-result',
                            toolCallId: part.toolCallId || part.id || 'unknown',
                            result: part.result,
                            isError: part.isError || false
                        };
                    default:
                        // Unknown part type, convert to text
                        return { type: 'text', text: JSON.stringify(part) };
                }
            });
        }
        
        // Fallback for unknown content types
        return [{ type: 'text', text: JSON.stringify(content) }];
    }
    
    private extractTextFromStructuredContent(content: any): string {
        if (typeof content === 'string') {
            return content;
        }
        
        if (Array.isArray(content)) {
            return content
                .filter(part => part?.type === 'text')
                .map(part => part.text || '')
                .join('\n');
        }
        
        return JSON.stringify(content);
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

    private generateSessionSummary(parsedSession: ParsedClaudeSession, sortedMessages: ParsedClaudeMessage[]): string {
        // Try to extract a meaningful description from the first user message
        const firstUserMessage = sortedMessages.find(m => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content) {
            let description = this.extractTextFromStructuredContent(firstUserMessage.content)
                .replace(/:::tool-\w+\{[^}]*\}[\s\S]*?:::/g, '') // Remove tool blocks
                .replace(/\n+/g, ' ') // Replace newlines with spaces
                .trim();
            
            // Take first sentence or first 150 characters
            const firstSentence = description.split(/[.!?]/)[0].trim();
            if (firstSentence.length > 0 && firstSentence.length <= 150) {
                return firstSentence;
            }
            
            // Fallback to first 150 characters
            if (description.length > 150) {
                description = description.substring(0, 147) + '...';
            }
            
            if (description.length > 0) {
                return description;
            }
        }
        
        // Fallback description based on metadata
        const { metadata } = parsedSession;
        const projectName = parsedSession.projectPath || 'Unknown project';
        const messageCount = metadata.totalMessages;
        const duration = Math.round((metadata.endTime.getTime() - metadata.startTime.getTime()) / (1000 * 60));
        
        return `Chat session in ${projectName} with ${messageCount} messages over ${duration} minutes`;
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