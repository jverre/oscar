import * as vscode from 'vscode';
import * as http from 'http';

export interface OscarSession {
    id: string;
    accessToken: string;
    account: {
        id: string;
        label: string;
    };
    scopes: string[];
}

export class OscarAuthenticationProvider implements vscode.AuthenticationProvider {
    private static readonly SESSION_KEY = 'oscar.sessions';
    private readonly _onDidChangeSessions = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private readonly context: vscode.ExtensionContext;

    public readonly onDidChangeSessions = this._onDidChangeSessions.event;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async getSessions(scopes?: readonly string[]): Promise<vscode.AuthenticationSession[]> {
        const sessions = await this.getStoredSessions();
        
        if (scopes) {
            return sessions.filter(session => 
                scopes.every(scope => session.scopes.includes(scope))
            );
        }
        
        return sessions;
    }

    public async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
        console.log('🔧 AUTH DEBUG: Starting createSession with scopes:', scopes);
        
        try {
            const config = vscode.workspace.getConfiguration('oscar');
            const authUrl = config.get<string>('authUrl', 'http://localhost:3000');
            console.log('🔧 AUTH DEBUG: Using authUrl:', authUrl);
            
            // Start local callback server
            const callbackPort = 54321;
            const callbackUrl = `http://localhost:${callbackPort}/callback`;
            console.log('🔧 AUTH DEBUG: Setting up callback server on:', callbackUrl);
            
            const session = await new Promise<vscode.AuthenticationSession>((resolve, reject) => {
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
                            const session: vscode.AuthenticationSession = {
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
                        } else {
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

        } catch (error) {
            console.log('💥 Authentication failed with error:', error);
            throw new Error(`Failed to create Oscar session: ${error}`);
        }
    }


    public async removeSession(sessionId: string): Promise<void> {
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


    private async getStoredSessions(): Promise<vscode.AuthenticationSession[]> {
        try {
            const sessionsJson = await this.context.secrets.get(OscarAuthenticationProvider.SESSION_KEY);
            if (sessionsJson) {
                return JSON.parse(sessionsJson);
            }
        } catch (error) {
            console.error('Failed to get stored sessions:', error);
        }
        return [];
    }

    private async storeSession(session: vscode.AuthenticationSession): Promise<void> {
        const sessions = await this.getStoredSessions();
        sessions.push(session);
        await this.context.secrets.store(OscarAuthenticationProvider.SESSION_KEY, JSON.stringify(sessions));
    }

}