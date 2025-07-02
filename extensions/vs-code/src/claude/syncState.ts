import * as vscode from 'vscode';

export interface SyncedSession {
    sessionId: string;
    lastSyncedMessageCount: number;
    lastSyncedAt: number;
    lastKnownFileModified: number; // File system modification time when last synced
    lastSyncedMessageTimestamp?: number; // Timestamp of the last synced message
    filePath: string; // Full path to the JSONL file
    oscarFileId?: string;
    status: 'synced' | 'pending' | 'error';
    error?: string;
}

export interface SyncStatistics {
    totalSessions: number;
    syncedSessions: number;
    pendingSessions: number;
    errorSessions: number;
    totalMessages: number;
    syncedMessages: number;
    lastSyncAt?: number;
}

export class SyncStateManager {
    private static readonly SYNC_STATE_KEY = 'oscar.syncState';
    private static readonly SYNC_STATS_KEY = 'oscar.syncStats';
    
    private context: vscode.ExtensionContext;
    private syncedSessions: Map<string, SyncedSession> = new Map();
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadSyncState();
    }
    
    private async loadSyncState(): Promise<void> {
        try {
            const stored = this.context.globalState.get<Record<string, SyncedSession>>(SyncStateManager.SYNC_STATE_KEY);
            if (stored) {
                this.syncedSessions = new Map(Object.entries(stored));
                console.log(`📊 Loaded sync state for ${this.syncedSessions.size} sessions`);
            }
        } catch (error) {
            console.log('Error loading sync state:', error);
        }
    }
    
    private async saveSyncState(): Promise<void> {
        try {
            const toStore = Object.fromEntries(this.syncedSessions);
            await this.context.globalState.update(SyncStateManager.SYNC_STATE_KEY, toStore);
        } catch (error) {
            console.log('Error saving sync state:', error);
        }
    }
    
    public async markSessionSynced(
        sessionId: string, 
        messageCount: number, 
        filePath: string,
        fileModifiedTime: number,
        lastMessageTimestamp?: number,
        oscarFileId?: string
    ): Promise<void> {
        console.log(`✅ Marking session ${sessionId} as synced (${messageCount} messages, modified: ${new Date(fileModifiedTime)})`);
        
        const syncedSession: SyncedSession = {
            sessionId,
            lastSyncedMessageCount: messageCount,
            lastSyncedAt: Date.now(),
            lastKnownFileModified: fileModifiedTime,
            lastSyncedMessageTimestamp: lastMessageTimestamp,
            filePath,
            oscarFileId,
            status: 'synced'
        };
        
        this.syncedSessions.set(sessionId, syncedSession);
        await this.saveSyncState();
        await this.updateStatistics();
    }
    
    public async markSessionPending(sessionId: string, filePath?: string): Promise<void> {
        
        const existing = this.syncedSessions.get(sessionId);
        const syncedSession: SyncedSession = {
            sessionId,
            lastSyncedMessageCount: existing?.lastSyncedMessageCount || 0,
            lastSyncedAt: existing?.lastSyncedAt || 0,
            lastKnownFileModified: existing?.lastKnownFileModified || 0,
            lastSyncedMessageTimestamp: existing?.lastSyncedMessageTimestamp,
            filePath: filePath || existing?.filePath || '',
            oscarFileId: existing?.oscarFileId,
            status: 'pending'
        };
        
        this.syncedSessions.set(sessionId, syncedSession);
        await this.saveSyncState();
    }
    
    public async markSessionError(sessionId: string, error: string, filePath?: string): Promise<void> {
        
        const existing = this.syncedSessions.get(sessionId);
        const syncedSession: SyncedSession = {
            sessionId,
            lastSyncedMessageCount: existing?.lastSyncedMessageCount || 0,
            lastSyncedAt: existing?.lastSyncedAt || 0,
            lastKnownFileModified: existing?.lastKnownFileModified || 0,
            lastSyncedMessageTimestamp: existing?.lastSyncedMessageTimestamp,
            filePath: filePath || existing?.filePath || '',
            oscarFileId: existing?.oscarFileId,
            status: 'error',
            error
        };
        
        this.syncedSessions.set(sessionId, syncedSession);
        await this.saveSyncState();
    }
    
    public isSessionSynced(sessionId: string, currentMessageCount: number, currentFileModified?: number): boolean {
        const syncedSession = this.syncedSessions.get(sessionId);
        
        if (!syncedSession) {
            return false;
        }
        
        // Session is considered synced if:
        // 1. Status is 'synced'
        // 2. Message count hasn't increased since last sync
        // 3. File hasn't been modified since last sync (if modification time is provided)
        const messageCountSynced = syncedSession.lastSyncedMessageCount >= currentMessageCount;
        const fileNotModified = !currentFileModified || syncedSession.lastKnownFileModified >= currentFileModified;
        
        return syncedSession.status === 'synced' && messageCountSynced && fileNotModified;
    }
    
    public needsSync(sessionId: string, currentMessageCount: number, currentFileModified?: number): boolean {
        const syncedSession = this.syncedSessions.get(sessionId);
        
        if (!syncedSession) {
            // New session, needs sync
            return true;
        }
        
        // Needs sync if:
        // 1. Status is 'pending' or 'error'
        // 2. Message count has increased since last sync
        // 3. File has been modified since last sync
        const statusNeedsSync = syncedSession.status !== 'synced';
        const messageCountIncreased = syncedSession.lastSyncedMessageCount < currentMessageCount;
        const fileModified = currentFileModified && syncedSession.lastKnownFileModified < currentFileModified;
        
        return statusNeedsSync || messageCountIncreased || !!fileModified;
    }
    
    public getSessionSyncState(sessionId: string): SyncedSession | undefined {
        return this.syncedSessions.get(sessionId);
    }
    
    public getAllSyncedSessions(): SyncedSession[] {
        return Array.from(this.syncedSessions.values());
    }
    
    public getSessionsNeedingSync(sessions: { sessionId: string; messageCount: number; lastModified?: number }[]): string[] {
        return sessions
            .filter(session => this.needsSync(session.sessionId, session.messageCount, session.lastModified))
            .map(session => session.sessionId);
    }
    
    public async detectStaleSessionsOnStartup(currentSessions: { sessionId: string; messageCount: number; lastModified: number; filePath: string }[]): Promise<string[]> {
        
        const staleSessions: string[] = [];
        
        for (const currentSession of currentSessions) {
            const syncState = this.syncedSessions.get(currentSession.sessionId);
            
            if (syncState) {
                // Check if file was modified since last sync
                const fileModified = currentSession.lastModified > syncState.lastKnownFileModified;
                const messageCountChanged = currentSession.messageCount !== syncState.lastSyncedMessageCount;
                
                if (fileModified || messageCountChanged) {
                    staleSessions.push(currentSession.sessionId);
                    
                    // Update the sync state to reflect that this session needs syncing
                    await this.markSessionPending(currentSession.sessionId, currentSession.filePath);
                }
            } else {
                // New session not in sync state
                staleSessions.push(currentSession.sessionId);
                await this.markSessionPending(currentSession.sessionId, currentSession.filePath);
            }
        }
        
        return staleSessions;
    }
    
    private async updateStatistics(): Promise<void> {
        const sessions = Array.from(this.syncedSessions.values());
        
        const stats: SyncStatistics = {
            totalSessions: sessions.length,
            syncedSessions: sessions.filter(s => s.status === 'synced').length,
            pendingSessions: sessions.filter(s => s.status === 'pending').length,
            errorSessions: sessions.filter(s => s.status === 'error').length,
            totalMessages: 0,
            syncedMessages: sessions
                .filter(s => s.status === 'synced')
                .reduce((sum, s) => sum + s.lastSyncedMessageCount, 0),
            lastSyncAt: Math.max(...sessions.map(s => s.lastSyncedAt), 0) || undefined
        };
        
        await this.context.globalState.update(SyncStateManager.SYNC_STATS_KEY, stats);
    }
    
    public async getStatistics(): Promise<SyncStatistics> {
        const stored = this.context.globalState.get<SyncStatistics>(SyncStateManager.SYNC_STATS_KEY);
        return stored || {
            totalSessions: 0,
            syncedSessions: 0,
            pendingSessions: 0,
            errorSessions: 0,
            totalMessages: 0,
            syncedMessages: 0
        };
    }
    
    public async clearSyncState(): Promise<void> {
        console.log('🧹 Clearing all sync state');
        this.syncedSessions.clear();
        await this.context.globalState.update(SyncStateManager.SYNC_STATE_KEY, undefined);
        await this.context.globalState.update(SyncStateManager.SYNC_STATS_KEY, undefined);
    }
    
    public async removeSession(sessionId: string): Promise<void> {
        if (this.syncedSessions.delete(sessionId)) {
            console.log(`🗑️ Removed sync state for session ${sessionId}`);
            await this.saveSyncState();
            await this.updateStatistics();
        }
    }
    
    public async retryFailedSessions(): Promise<string[]> {
        const failedSessions = Array.from(this.syncedSessions.values())
            .filter(session => session.status === 'error')
            .map(session => session.sessionId);
            
        // Mark all failed sessions as pending for retry
        for (const sessionId of failedSessions) {
            await this.markSessionPending(sessionId);
        }
        
        console.log(`🔄 Marked ${failedSessions.length} failed sessions for retry`);
        return failedSessions;
    }
}