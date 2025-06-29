"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const oscarAuthProvider_1 = require("./auth/oscarAuthProvider");
const statusBar_1 = require("./ui/statusBar");
const fileWatcher_1 = require("./claude/fileWatcher");
const syncState_1 = require("./claude/syncState");
const syncService_1 = require("./oscar/syncService");
let authProvider;
let statusBar;
let fileWatcher;
let syncStateManager;
let syncService;
async function activate(context) {
    console.log('Oscar extension is now active!');
    // Initialize authentication provider
    authProvider = new oscarAuthProvider_1.OscarAuthenticationProvider(context);
    // Register the authentication provider
    const providerDisposable = vscode.authentication.registerAuthenticationProvider('oscar', 'Oscar', authProvider, { supportsMultipleAccounts: false });
    // Check if user is already authenticated
    let isAuthenticated = false;
    try {
        const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
        isAuthenticated = !!session;
    }
    catch (error) {
        // No existing session
        isAuthenticated = false;
    }
    // Initialize sync state manager
    syncStateManager = new syncState_1.SyncStateManager(context);
    // Initialize Claude Code file watcher
    fileWatcher = new fileWatcher_1.ClaudeFileWatcher(context);
    // Initialize sync service
    syncService = new syncService_1.OscarSyncService(context, syncStateManager, fileWatcher);
    // Set up event handlers for file watcher
    fileWatcher.onNewSessionEvent(async (session) => {
        console.log(`🆕 New Claude session detected: ${session.sessionId} (${session.messageCount} messages)`);
        if (isAuthenticated && syncService.isReady()) {
            await syncStateManager.markSessionPending(session.sessionId, session.filePath);
            // Auto-sync if enabled
            const config = vscode.workspace.getConfiguration('oscar');
            const autoSync = config.get('autoSync', true);
            if (autoSync) {
                setTimeout(async () => {
                    console.log(`🔄 Auto-syncing new session: ${session.sessionId}`);
                    await syncService.syncSession(session.sessionId);
                }, 1000); // Small delay to avoid overwhelming
            }
        }
    });
    fileWatcher.onSessionUpdatedEvent(async (session) => {
        console.log(`📝 Claude session updated: ${session.sessionId} (${session.messageCount} messages)`);
        if (isAuthenticated && syncService.isReady()) {
            if (syncStateManager.needsSync(session.sessionId, session.messageCount, session.lastModified)) {
                await syncStateManager.markSessionPending(session.sessionId, session.filePath);
                // Auto-sync if enabled
                const config = vscode.workspace.getConfiguration('oscar');
                const autoSync = config.get('autoSync', true);
                if (autoSync) {
                    setTimeout(async () => {
                        console.log(`🔄 Auto-syncing updated session: ${session.sessionId}`);
                        await syncService.syncSession(session.sessionId);
                    }, 2000); // Slightly longer delay for updates
                }
            }
        }
    });
    // Start file watcher
    await fileWatcher.start();
    // Detect sessions that were updated while the extension was not running
    if (isAuthenticated) {
        console.log('🔄 Checking for stale sessions that need initial sync...');
        const currentSessions = fileWatcher.getSessions().map(s => ({
            sessionId: s.sessionId,
            messageCount: s.messageCount,
            lastModified: s.lastModified,
            filePath: s.filePath
        }));
        const staleSessions = await syncStateManager.detectStaleSessionsOnStartup(currentSessions);
        if (staleSessions.length > 0) {
            console.log(`📊 Found ${staleSessions.length} stale sessions that need syncing`);
            // Initialize sync service and trigger background sync
            setTimeout(async () => {
                try {
                    console.log('🔧 Initializing sync service for startup sync...');
                    // Ensure sync service is initialized
                    if (!syncService.isReady()) {
                        const initSuccess = await syncService.initialize();
                        if (!initSuccess) {
                            console.log('❌ Failed to initialize sync service for startup sync');
                            return;
                        }
                    }
                    if (syncService.isReady()) {
                        console.log('🚀 Starting background sync of stale sessions...');
                        const results = await syncService.syncPendingSessions();
                        const successful = results.filter(r => r.success).length;
                        const failed = results.filter(r => !r.success).length;
                        const totalMessages = results.reduce((sum, r) => sum + r.messagesSynced, 0);
                        console.log(`✅ Startup sync completed: ${successful} sessions synced, ${failed} failed (${totalMessages} messages total)`);
                        if (failed > 0) {
                            console.log('⚠️ Some sessions failed to sync during startup - they will be retried later');
                        }
                    }
                }
                catch (error) {
                    console.error('❌ Error during startup sync:', error);
                }
            }, 3000); // Delay to let extension fully initialize
        }
        else {
            console.log('✅ All sessions are up to date, no startup sync needed');
        }
    }
    console.log('🔧 AUTH DEBUG: Extension activation complete, isAuthenticated:', isAuthenticated);
    // Initialize status bar
    statusBar = new statusBar_1.OscarStatusBar();
    statusBar.setAuthenticationStatus(isAuthenticated);
    // Listen for authentication changes
    const authChangeListener = vscode.authentication.onDidChangeSessions(async (event) => {
        if (event.provider.id === 'oscar') {
            // Check if we have any active sessions
            try {
                const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
                const wasAuthenticated = statusBar.getAuthenticationStatus();
                const nowAuthenticated = !!session;
                statusBar.setAuthenticationStatus(nowAuthenticated);
                // If user just signed in, initialize sync service
                if (!wasAuthenticated && nowAuthenticated) {
                    console.log('🔧 User signed in, initializing sync service...');
                    await syncService.initialize();
                    // Trigger initial sync if there are pending sessions
                    setTimeout(async () => {
                        if (syncService.isReady()) {
                            console.log('🔄 Starting initial sync after sign-in...');
                            await syncService.syncPendingSessions();
                        }
                    }, 2000);
                }
            }
            catch (error) {
                statusBar.setAuthenticationStatus(false);
            }
        }
    });
    // Register commands
    const signInCommand = vscode.commands.registerCommand('oscar.signIn', async () => {
        try {
            await vscode.authentication.getSession('oscar', ['read'], { createIfNone: true });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to sign in: ${error}`);
        }
    });
    const signOutCommand = vscode.commands.registerCommand('oscar.signOut', async () => {
        try {
            const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
            if (session) {
                await authProvider.removeSession(session.id);
                vscode.window.showInformationMessage('Successfully signed out of Oscar.');
            }
        }
        catch (error) {
            vscode.window.showInformationMessage('No active Oscar session to sign out.');
        }
    });
    const syncNowCommand = vscode.commands.registerCommand('oscar.syncNow', async () => {
        try {
            const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
            if (!session) {
                vscode.window.showWarningMessage('Please sign in to Oscar first.');
                return;
            }
            if (!syncService.isReady()) {
                await syncService.initialize();
            }
            if (!syncService.isReady()) {
                vscode.window.showErrorMessage('Sync service is not ready. Please check your authentication.');
                return;
            }
            // Trigger manual sync with progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Syncing Claude Code chats to Oscar...',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Finding sessions to sync...' });
                const results = await syncService.syncPendingSessions();
                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;
                const totalMessages = results.reduce((sum, r) => sum + r.messagesSynced, 0);
                if (failed > 0) {
                    vscode.window.showWarningMessage(`Sync completed: ${successful} sessions synced, ${failed} failed (${totalMessages} messages total)`);
                }
                else if (successful > 0) {
                    vscode.window.showInformationMessage(`Successfully synced ${successful} sessions (${totalMessages} messages) to Oscar!`);
                }
                else {
                    vscode.window.showInformationMessage('All Claude Code sessions are already up to date!');
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Sync failed: ${error}`);
        }
    });
    const showMenuCommand = vscode.commands.registerCommand('oscar.showMenu', async () => {
        try {
            const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
            if (!session) {
                vscode.window.showWarningMessage('Please sign in to Oscar first.');
                return;
            }
            // Show quick pick menu with options
            const choice = await vscode.window.showQuickPick([
                {
                    label: '$(sync) Sync Claude Code chats now',
                    description: 'Manually sync your Claude Code conversations to Oscar',
                    action: 'sync'
                },
                {
                    label: '$(sign-out) Sign out of Oscar',
                    description: 'Sign out and stop syncing chats',
                    action: 'signout'
                }
            ], {
                placeHolder: 'Choose an action'
            });
            if (choice) {
                if (choice.action === 'sync') {
                    vscode.commands.executeCommand('oscar.syncNow');
                }
                else if (choice.action === 'signout') {
                    vscode.commands.executeCommand('oscar.signOut');
                }
            }
        }
        catch (error) {
            vscode.window.showWarningMessage('Please sign in to Oscar first.');
        }
    });
    // Add to context subscriptions for proper cleanup
    context.subscriptions.push(providerDisposable, authChangeListener, signInCommand, signOutCommand, syncNowCommand, showMenuCommand, statusBar);
    // Show welcome message only if not authenticated
    if (!isAuthenticated) {
        vscode.window.showInformationMessage('Oscar extension activated! Click the status bar to sign in and start syncing Claude Code chats.', 'Sign In').then(selection => {
            if (selection === 'Sign In') {
                vscode.commands.executeCommand('oscar.signIn');
            }
        });
    }
    else {
        console.log('Oscar extension activated and user is already authenticated');
    }
}
function deactivate() {
    console.log('Oscar extension is being deactivated');
    statusBar?.dispose();
    fileWatcher?.stop();
}
//# sourceMappingURL=extension.js.map