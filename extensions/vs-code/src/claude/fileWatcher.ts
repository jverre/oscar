import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ClaudeSession {
    sessionId: string;
    filePath: string;
    projectPath: string;
    lastModified: number;
    messageCount: number;
}

export interface ClaudeMessage {
    uuid: string;
    parentUuid?: string;
    sessionId: string;
    timestamp: string;
    type: 'user' | 'assistant';
    message: {
        role: 'user' | 'assistant';
        content: string | any[];
        model?: string;
    };
    cwd?: string;
    version?: string;
}

export class ClaudeFileWatcher {
    private watcher?: vscode.FileSystemWatcher;
    private sessions: Map<string, ClaudeSession> = new Map();
    private onSessionUpdated = new vscode.EventEmitter<ClaudeSession>();
    private onNewSession = new vscode.EventEmitter<ClaudeSession>();
    private context: vscode.ExtensionContext;
    
    public readonly onSessionUpdatedEvent = this.onSessionUpdated.event;
    public readonly onNewSessionEvent = this.onNewSession.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async start(): Promise<void> {
        console.log('🔍 Starting Claude Code file watcher...');
        
        const claudeProjectsPath = this.getClaudeProjectsPath();
        if (!claudeProjectsPath) {
            console.log('❌ Claude projects directory not found');
            vscode.window.showWarningMessage('Claude Code projects directory not found. Make sure Claude Code is installed.');
            return;
        }

        console.log('📁 Watching Claude projects directory:', claudeProjectsPath);

        // Initial scan of existing files
        await this.scanExistingSessions(claudeProjectsPath);

        // Set up file system watcher
        const pattern = new vscode.RelativePattern(claudeProjectsPath, '**/*.jsonl');
        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        // Watch for new files
        this.watcher.onDidCreate(async (uri) => {
            await this.processSessionFile(uri.fsPath);
        });

        // Watch for file changes
        this.watcher.onDidChange(async (uri) => {
            await this.processSessionFile(uri.fsPath);
        });

        // Watch for file deletions
        this.watcher.onDidDelete((uri) => {
            this.removeSession(uri.fsPath);
        });

        console.log('✅ Claude Code file watcher started successfully');
    }

    public stop(): void {
        console.log('🛑 Stopping Claude Code file watcher...');
        this.watcher?.dispose();
        this.onSessionUpdated.dispose();
        this.onNewSession.dispose();
    }

    private getClaudeProjectsPath(): string | null {
        const homeDir = os.homedir();
        const claudeProjectsPath = path.join(homeDir, '.claude', 'projects');
        
        try {
            if (fs.existsSync(claudeProjectsPath)) {
                return claudeProjectsPath;
            }
        } catch (error) {
            console.log('Error checking Claude projects path:', error);
        }
        
        return null;
    }

    private async scanExistingSessions(projectsPath: string): Promise<void> {
        console.log('🔎 Scanning existing Claude sessions...');
        
        try {
            const projectDirs = fs.readdirSync(projectsPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const projectDir of projectDirs) {
                const projectPath = path.join(projectsPath, projectDir);
                const jsonlFiles = fs.readdirSync(projectPath)
                    .filter(file => file.endsWith('.jsonl'))
                    .map(file => path.join(projectPath, file));

                for (const filePath of jsonlFiles) {
                    await this.processSessionFile(filePath);
                }
            }

            console.log(`📊 Found ${this.sessions.size} existing Claude sessions`);
        } catch (error) {
            console.log('Error scanning existing sessions:', error);
        }
    }

    private async processSessionFile(filePath: string): Promise<void> {
        try {
            const stats = fs.statSync(filePath);
            const sessionId = path.basename(filePath, '.jsonl');
            const projectPath = path.dirname(filePath);
            const projectName = path.basename(projectPath);
            
            // Read and count messages
            const messageCount = await this.countMessages(filePath);
            
            const session: ClaudeSession = {
                sessionId,
                filePath,
                projectPath: projectName,
                lastModified: stats.mtime.getTime(),
                messageCount
            };

            const existingSession = this.sessions.get(sessionId);
            const isNewSession = !existingSession;
            
            // Update session in map
            this.sessions.set(sessionId, session);
            
            // Fire appropriate event
            if (isNewSession) {
                this.onNewSession.fire(session);
            } else if (existingSession.messageCount !== messageCount || existingSession.lastModified !== session.lastModified) {
                this.onSessionUpdated.fire(session);
            }
            
        } catch (error) {
            console.log(`Error processing session file ${filePath}:`, error);
        }
    }

    private async countMessages(filePath: string): Promise<number> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            return lines.length;
        } catch (error) {
            console.log(`Error counting messages in ${filePath}:`, error);
            return 0;
        }
    }

    private removeSession(filePath: string): void {
        const sessionId = path.basename(filePath, '.jsonl');
        if (this.sessions.delete(sessionId)) {
            console.log(`🗑️ Removed session ${sessionId} from tracking`);
        }
    }

    public getSessions(): ClaudeSession[] {
        return Array.from(this.sessions.values());
    }

    public getSession(sessionId: string): ClaudeSession | undefined {
        return this.sessions.get(sessionId);
    }

    public async getSessionMessages(sessionId: string): Promise<ClaudeMessage[]> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        try {
            const content = fs.readFileSync(session.filePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            const messages: ClaudeMessage[] = [];
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    messages.push(parsed as ClaudeMessage);
                } catch (error) {
                    console.log(`Error parsing message line: ${line.substring(0, 100)}...`);
                }
            }
            
            return messages;
        } catch (error) {
            console.log(`Error reading session messages from ${session.filePath}:`, error);
            throw error;
        }
    }
}