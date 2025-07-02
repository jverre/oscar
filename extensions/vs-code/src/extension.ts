import * as vscode from 'vscode';
import { OscarAuthenticationProvider } from './auth/oscarAuthProvider';
import { OscarStatusBar } from './ui/statusBar';
import { ClaudeFileWatcher } from './claude/fileWatcher';
import { SyncStateManager } from './claude/syncState';
import { OscarSyncService } from './oscar/syncService';

let authProvider: OscarAuthenticationProvider;
let statusBar: OscarStatusBar;
let fileWatcher: ClaudeFileWatcher;
let syncStateManager: SyncStateManager;
let syncService: OscarSyncService;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Oscar extension is now active!');
    
    // Initialize authentication provider
    authProvider = new OscarAuthenticationProvider(context);
    
    // Register the authentication provider
    const providerDisposable = vscode.authentication.registerAuthenticationProvider(
        'oscar',
        'Oscar',
        authProvider,
        { supportsMultipleAccounts: false }
    );
    
    // Check if user is already authenticated
    let isAuthenticated = false;
    try {
        const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
        isAuthenticated = !!session;
    } catch (error) {
        // No existing session
        isAuthenticated = false;
    }
    
    // Initialize sync state manager
    syncStateManager = new SyncStateManager(context);
    
    // Initialize Claude Code file watcher
    fileWatcher = new ClaudeFileWatcher(context);
    
    // Initialize sync service
    syncService = new OscarSyncService(context, syncStateManager, fileWatcher);
    
    // Set up event handlers for file watcher
    // Simplified: Single handler for all session changes (new or updated)
    const handleSessionChange = async (session: any, eventType: string) => {
        console.log(`${eventType} Claude session: ${session.sessionId} (${session.messageCount} messages)`);
        
        if (isAuthenticated && syncService.isReady()) {
            if (syncStateManager.needsSync(session.sessionId, session.messageCount, session.lastModified)) {
                await syncStateManager.markSessionPending(session.sessionId, session.filePath);
                
                // Auto-sync if enabled
                const config = vscode.workspace.getConfiguration('oscar');
                const autoSync = config.get<boolean>('autoSync', true);
                if (autoSync) {
                    setTimeout(async () => {
                        console.log(`🔄 Auto-syncing session: ${session.sessionId}`);
                        await syncService.syncSession(session.sessionId);
                    }, 1500); // Single consistent delay
                }
            }
        }
    };
    
    // Wire up both events to the same simplified handler
    fileWatcher.onNewSessionEvent(async (session) => await handleSessionChange(session, '🆕 New'));
    fileWatcher.onSessionUpdatedEvent(async (session) => await handleSessionChange(session, '📝 Updated'));
    
    // Start file watcher
    await fileWatcher.start();
    
    // Simplified startup: just mark pending sessions, let auto-sync handle them
    if (isAuthenticated) {
        console.log('🔄 Checking for sessions needing sync...');
        const currentSessions = fileWatcher.getSessions().map(s => ({
            sessionId: s.sessionId,
            messageCount: s.messageCount,
            lastModified: s.lastModified,
            filePath: s.filePath
        }));
        
        const staleSessions = await syncStateManager.detectStaleSessionsOnStartup(currentSessions);
        if (staleSessions.length > 0) {
            console.log(`📊 Marked ${staleSessions.length} sessions as pending sync`);
        } else {
            console.log('✅ All sessions are up to date');
        }
    }
    
    console.log('🔧 AUTH DEBUG: Extension activation complete, isAuthenticated:', isAuthenticated);
    
    // Initialize status bar
    statusBar = new OscarStatusBar();
    statusBar.setAuthenticationStatus(isAuthenticated);
    
    // Listen for authentication changes
    const authChangeListener = vscode.authentication.onDidChangeSessions(async event => {
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
                    // Pending sessions will be handled by the unified auto-sync logic
                }
            } catch (error) {
                statusBar.setAuthenticationStatus(false);
            }
        }
    });
    
    // Register commands
    const signInCommand = vscode.commands.registerCommand('oscar.signIn', async () => {
        try {
            await vscode.authentication.getSession('oscar', ['read'], { createIfNone: true });
        } catch (error) {
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
        } catch (error) {
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
                    vscode.window.showWarningMessage(
                        `Sync completed: ${successful} sessions synced, ${failed} failed (${totalMessages} messages total)`
                    );
                } else if (successful > 0) {
                    vscode.window.showInformationMessage(
                        `Successfully synced ${successful} sessions (${totalMessages} messages) to Oscar!`
                    );
                } else {
                    vscode.window.showInformationMessage('All Claude Code sessions are already up to date!');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Sync failed: ${error}`);
        }
    });

    const resetSyncStateCommand = vscode.commands.registerCommand('oscar.resetSyncState', async () => {
        try {
            await syncStateManager.clearSyncState();
            vscode.window.showInformationMessage('Oscar sync state has been reset. All sessions will be re-synced on next sync.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to reset sync state: ${error}`);
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
                    label: '$(refresh) Reset sync state',
                    description: 'Reset sync state - all sessions will be re-synced',
                    action: 'reset'
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
                } else if (choice.action === 'reset') {
                    vscode.commands.executeCommand('oscar.resetSyncState');
                } else if (choice.action === 'signout') {
                    vscode.commands.executeCommand('oscar.signOut');
                }
            }
        } catch (error) {
            vscode.window.showWarningMessage('Please sign in to Oscar first.');
        }
    });
    
    // Add to context subscriptions for proper cleanup
    context.subscriptions.push(
        providerDisposable,
        authChangeListener,
        signInCommand, 
        signOutCommand, 
        syncNowCommand,
        resetSyncStateCommand,
        showMenuCommand,
        statusBar
    );
    
    // Show welcome message only if not authenticated
    if (!isAuthenticated) {
        vscode.window.showInformationMessage(
            'Oscar extension activated! Click the status bar to sign in and start syncing Claude Code chats.',
            'Sign In'
        ).then(selection => {
            if (selection === 'Sign In') {
                vscode.commands.executeCommand('oscar.signIn');
            }
        });
    } else {
        console.log('Oscar extension activated and user is already authenticated');
    }
}

export function deactivate() {
    console.log('Oscar extension is being deactivated');
    statusBar?.dispose();
    fileWatcher?.stop();
}