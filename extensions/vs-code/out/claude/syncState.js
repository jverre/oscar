"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncStateManager = void 0;
class SyncStateManager {
    static SYNC_STATE_KEY = 'oscar.syncState';
    static SYNC_STATS_KEY = 'oscar.syncStats';
    context;
    syncedSessions = new Map();
    constructor(context) {
        this.context = context;
        this.loadSyncState();
    }
    async loadSyncState() {
        try {
            const stored = this.context.globalState.get(SyncStateManager.SYNC_STATE_KEY);
            if (stored) {
                this.syncedSessions = new Map(Object.entries(stored));
                console.log(`📊 Loaded sync state for ${this.syncedSessions.size} sessions`);
            }
        }
        catch (error) {
            console.log('Error loading sync state:', error);
        }
    }
    async saveSyncState() {
        try {
            const toStore = Object.fromEntries(this.syncedSessions);
            await this.context.globalState.update(SyncStateManager.SYNC_STATE_KEY, toStore);
        }
        catch (error) {
            console.log('Error saving sync state:', error);
        }
    }
    async markSessionSynced(sessionId, messageCount, filePath, fileModifiedTime, lastMessageTimestamp, oscarFileId) {
        console.log(`✅ Marking session ${sessionId} as synced (${messageCount} messages, modified: ${new Date(fileModifiedTime)})`);
        const syncedSession = {
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
    async markSessionPending(sessionId, filePath) {
        const existing = this.syncedSessions.get(sessionId);
        const syncedSession = {
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
    async markSessionError(sessionId, error, filePath) {
        const existing = this.syncedSessions.get(sessionId);
        const syncedSession = {
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
    isSessionSynced(sessionId, currentMessageCount, currentFileModified) {
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
    needsSync(sessionId, currentMessageCount, currentFileModified) {
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
    getSessionSyncState(sessionId) {
        return this.syncedSessions.get(sessionId);
    }
    getAllSyncedSessions() {
        return Array.from(this.syncedSessions.values());
    }
    getSessionsNeedingSync(sessions) {
        return sessions
            .filter(session => this.needsSync(session.sessionId, session.messageCount, session.lastModified))
            .map(session => session.sessionId);
    }
    async detectStaleSessionsOnStartup(currentSessions) {
        const staleSessions = [];
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
            }
            else {
                // New session not in sync state
                staleSessions.push(currentSession.sessionId);
                await this.markSessionPending(currentSession.sessionId, currentSession.filePath);
            }
        }
        return staleSessions;
    }
    async updateStatistics() {
        const sessions = Array.from(this.syncedSessions.values());
        const stats = {
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
    async getStatistics() {
        const stored = this.context.globalState.get(SyncStateManager.SYNC_STATS_KEY);
        return stored || {
            totalSessions: 0,
            syncedSessions: 0,
            pendingSessions: 0,
            errorSessions: 0,
            totalMessages: 0,
            syncedMessages: 0
        };
    }
    async clearSyncState() {
        console.log('🧹 Clearing all sync state');
        this.syncedSessions.clear();
        await this.context.globalState.update(SyncStateManager.SYNC_STATE_KEY, undefined);
        await this.context.globalState.update(SyncStateManager.SYNC_STATS_KEY, undefined);
    }
    async removeSession(sessionId) {
        if (this.syncedSessions.delete(sessionId)) {
            console.log(`🗑️ Removed sync state for session ${sessionId}`);
            await this.saveSyncState();
            await this.updateStatistics();
        }
    }
    async retryFailedSessions() {
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
exports.SyncStateManager = SyncStateManager;
//# sourceMappingURL=syncState.js.map