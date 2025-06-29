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
exports.ClaudeFileWatcher = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ClaudeFileWatcher {
    watcher;
    sessions = new Map();
    onSessionUpdated = new vscode.EventEmitter();
    onNewSession = new vscode.EventEmitter();
    context;
    onSessionUpdatedEvent = this.onSessionUpdated.event;
    onNewSessionEvent = this.onNewSession.event;
    constructor(context) {
        this.context = context;
    }
    async start() {
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
            console.log('📄 New Claude session file detected:', uri.fsPath);
            await this.processSessionFile(uri.fsPath);
        });
        // Watch for file changes
        this.watcher.onDidChange(async (uri) => {
            console.log('📝 Claude session file updated:', uri.fsPath);
            await this.processSessionFile(uri.fsPath);
        });
        // Watch for file deletions
        this.watcher.onDidDelete((uri) => {
            console.log('🗑️ Claude session file deleted:', uri.fsPath);
            this.removeSession(uri.fsPath);
        });
        console.log('✅ Claude Code file watcher started successfully');
    }
    stop() {
        console.log('🛑 Stopping Claude Code file watcher...');
        this.watcher?.dispose();
        this.onSessionUpdated.dispose();
        this.onNewSession.dispose();
    }
    getClaudeProjectsPath() {
        const homeDir = os.homedir();
        const claudeProjectsPath = path.join(homeDir, '.claude', 'projects');
        try {
            if (fs.existsSync(claudeProjectsPath)) {
                return claudeProjectsPath;
            }
        }
        catch (error) {
            console.log('Error checking Claude projects path:', error);
        }
        return null;
    }
    async scanExistingSessions(projectsPath) {
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
        }
        catch (error) {
            console.log('Error scanning existing sessions:', error);
        }
    }
    async processSessionFile(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const sessionId = path.basename(filePath, '.jsonl');
            const projectPath = path.dirname(filePath);
            const projectName = path.basename(projectPath);
            // Read and count messages
            const messageCount = await this.countMessages(filePath);
            const session = {
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
            console.log(`📊 Processed session ${sessionId}: ${messageCount} messages (${isNewSession ? 'NEW' : 'UPDATED'})`);
            // Fire appropriate event
            if (isNewSession) {
                this.onNewSession.fire(session);
            }
            else if (existingSession.messageCount !== messageCount || existingSession.lastModified !== session.lastModified) {
                this.onSessionUpdated.fire(session);
            }
        }
        catch (error) {
            console.log(`Error processing session file ${filePath}:`, error);
        }
    }
    async countMessages(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            return lines.length;
        }
        catch (error) {
            console.log(`Error counting messages in ${filePath}:`, error);
            return 0;
        }
    }
    removeSession(filePath) {
        const sessionId = path.basename(filePath, '.jsonl');
        if (this.sessions.delete(sessionId)) {
            console.log(`🗑️ Removed session ${sessionId} from tracking`);
        }
    }
    getSessions() {
        return Array.from(this.sessions.values());
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    async getSessionMessages(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        try {
            const content = fs.readFileSync(session.filePath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            const messages = [];
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    messages.push(parsed);
                }
                catch (error) {
                    console.log(`Error parsing message line: ${line.substring(0, 100)}...`);
                }
            }
            return messages;
        }
        catch (error) {
            console.log(`Error reading session messages from ${session.filePath}:`, error);
            throw error;
        }
    }
}
exports.ClaudeFileWatcher = ClaudeFileWatcher;
//# sourceMappingURL=fileWatcher.js.map