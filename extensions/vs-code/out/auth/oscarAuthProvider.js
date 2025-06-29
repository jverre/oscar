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
exports.OscarAuthenticationProvider = void 0;
const vscode = __importStar(require("vscode"));
const http = __importStar(require("http"));
class OscarAuthenticationProvider {
    static SESSION_KEY = 'oscar.sessions';
    _onDidChangeSessions = new vscode.EventEmitter();
    context;
    onDidChangeSessions = this._onDidChangeSessions.event;
    constructor(context) {
        this.context = context;
    }
    async getSessions(scopes) {
        const sessions = await this.getStoredSessions();
        if (scopes) {
            return sessions.filter(session => scopes.every(scope => session.scopes.includes(scope)));
        }
        return sessions;
    }
    async createSession(scopes) {
        console.log('🔧 AUTH DEBUG: Starting createSession with scopes:', scopes);
        try {
            const config = vscode.workspace.getConfiguration('oscar');
            const authUrl = config.get('authUrl', 'http://localhost:3000');
            console.log('🔧 AUTH DEBUG: Using authUrl:', authUrl);
            // Start local callback server
            const callbackPort = 54321;
            const callbackUrl = `http://localhost:${callbackPort}/callback`;
            console.log('🔧 AUTH DEBUG: Setting up callback server on:', callbackUrl);
            const session = await new Promise((resolve, reject) => {
                const server = http.createServer(async (req, res) => {
                    console.log('🔧 AUTH DEBUG: Callback server received request:', req.url);
                    if (req.url?.startsWith('/callback')) {
                        const url = new URL(req.url, `http://localhost:${callbackPort}`);
                        const token = url.searchParams.get('token');
                        console.log('🔧 AUTH DEBUG: Extracted parameters:');
                        console.log('  - token:', token ? `${token.substring(0, 8)}...` : 'null');
                        // Send success response to browser
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
                            <html>
                                <body style="font-family: Arial; text-align: center; padding: 50px; background: #141414; color: #D0D0D0;">
                                    <h1 style="color: #98C379;">✓ Authentication Successful</h1>
                                    <p>You are now ready to use the Oscar extension</p>
                                    <p style="color: #838383;">You can close this window and return to VS Code</p>
                                </body>
                            </html>
                        `);
                        server.close();
                        if (token) {
                            console.log('🔧 AUTH DEBUG: Creating session with API key');
                            const sessionId = `oscar-${Date.now()}`;
                            const session = {
                                id: sessionId,
                                accessToken: token, // This is the API key from Oscar
                                account: {
                                    id: 'oscar-user',
                                    label: 'Oscar User'
                                },
                                scopes: Array.from(scopes)
                            };
                            console.log('🔧 AUTH DEBUG: Created session with API key:', {
                                id: session.id,
                                hasToken: !!session.accessToken
                            });
                            resolve(session);
                        }
                        else {
                            console.log('🔧 AUTH DEBUG: Missing API key');
                            reject(new Error('Missing API key'));
                        }
                    }
                });
                server.listen(callbackPort, () => {
                    console.log('🔧 AUTH DEBUG: Callback server listening on port:', callbackPort);
                    // Open Oscar auth page with callback URL
                    const oauthUrl = `${authUrl}/auth/vscode?callback=${encodeURIComponent(callbackUrl)}`;
                    console.log('🔧 AUTH DEBUG: Opening OAuth URL:', oauthUrl);
                    vscode.env.openExternal(vscode.Uri.parse(oauthUrl));
                });
                // Timeout after 5 minutes
                setTimeout(() => {
                    server.close();
                    reject(new Error('Authentication timed out'));
                }, 300000);
            });
            await this.storeSession(session);
            this._onDidChangeSessions.fire({
                added: [session],
                removed: [],
                changed: []
            });
            return session;
        }
        catch (error) {
            console.log('💥 Authentication failed with error:', error);
            throw new Error(`Failed to create Oscar session: ${error}`);
        }
    }
    async removeSession(sessionId) {
        const sessions = await this.getStoredSessions();
        const sessionIndex = sessions.findIndex(session => session.id === sessionId);
        if (sessionIndex === -1) {
            return;
        }
        const removedSession = sessions[sessionIndex];
        sessions.splice(sessionIndex, 1);
        await this.context.secrets.store(OscarAuthenticationProvider.SESSION_KEY, JSON.stringify(sessions));
        this._onDidChangeSessions.fire({
            added: [],
            removed: [removedSession],
            changed: []
        });
    }
    async getStoredSessions() {
        try {
            const sessionsJson = await this.context.secrets.get(OscarAuthenticationProvider.SESSION_KEY);
            if (sessionsJson) {
                return JSON.parse(sessionsJson);
            }
        }
        catch (error) {
            console.error('Failed to get stored sessions:', error);
        }
        return [];
    }
    async storeSession(session) {
        const sessions = await this.getStoredSessions();
        sessions.push(session);
        await this.context.secrets.store(OscarAuthenticationProvider.SESSION_KEY, JSON.stringify(sessions));
    }
}
exports.OscarAuthenticationProvider = OscarAuthenticationProvider;
//# sourceMappingURL=oscarAuthProvider.js.map