import * as vscode from 'vscode';

export interface OscarFile {
    _id: string;
    name: string;
    lastMessageAt: number;
    createdAt: number;
    isStreaming: boolean;
    editable: boolean;
    metadata?: {
        claudeCodeSessionId?: string;
        claudeCodeProjectPath?: string;
        claudeCodeCwd?: string;
        claudeCodeVersion?: string;
        importedAt?: number;
    };
}

export interface OscarMessage {
    _id: string;
    fileId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
    provider?: string;
    parentMessageId?: string;
    isStreaming: boolean;
    metadata?: {
        claudeCodeUuid?: string;
        claudeCodeParentUuid?: string;
        claudeCodeTimestamp?: string;
        claudeCodeRequestId?: string;
        toolUses?: any[];
        tokenCount?: number;
        latency?: number;
        error?: string;
    };
    createdAt: number;
}

export interface ClaudeCodeLogEntry {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata: {
        claudeType?: string;
        claudeUuid: string;
        claudeTimestamp: string;
        isToolUse?: boolean;
        toolName?: string;
        toolUseId?: string;
        toolCallId?: string;
        toolResultId?: string;
        claudeOriginal?: any;
    };
}

export interface ClaudeCodeBatchLogRequest {
    sessionId: string;
    entries: ClaudeCodeLogEntry[];
}

export class OscarApiClient {
    private authToken?: string;
    private sessionId?: string;
    private authUrl: string;
    private apiUrl: string;
    
    constructor() {
        const config = vscode.workspace.getConfiguration('oscar');
        this.authUrl = config.get<string>('authUrl', 'http://localhost:3000');
        this.apiUrl = config.get<string>('apiUrl', 'https://accomplished-koala-846.convex.site');
    }
    
    public async initialize(): Promise<boolean> {
        try {
            // Get authentication session
            const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
            if (!session) {
                return false;
            }
            
            this.authToken = session.accessToken;
            this.sessionId = session.id;
            return true;
        } catch (error) {
            return false;
        }
    }
    
    public async claudeCodeBatchLog(request: ClaudeCodeBatchLogRequest): Promise<{ success: boolean; fileId: string; messagesCreated: number }> {
        console.log(`📦 CLAUDE CODE BATCH LOG: Starting upload of ${request.entries.length} entries for session ${request.sessionId}`);
        
        const response = await this.makeRequest('/api/claude-code/batch-log', {
            method: 'POST',
            body: JSON.stringify(request)
        });
        
        if (!response.ok) {
            const error = await response.text();
            console.log(`❌ CLAUDE CODE BATCH LOG FAILED: ${response.status} ${response.statusText} - ${error}`);
            throw new Error(`Failed to batch log: ${response.status} ${error}`);
        }
        
        const result = await response.json() as { success: boolean; fileId: string; messagesCreated: number };
        console.log(`✅ CLAUDE CODE BATCH LOG SUCCESS: Created/updated file ${result.fileId} with ${result.messagesCreated} messages`);
        return result;
    }
    
    private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
        if (!this.authToken) {
            throw new Error('Not authenticated - no auth token available');
        }
        
        const url = `${this.apiUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`,
            ...options.headers
        };
        
        const method = options.method || 'GET';
        console.log(`🌐 API REQUEST: ${method} ${url}`);
        if (options.body) {
            const bodyPreview = options.body.toString().substring(0, 200);
            console.log(`📤 REQUEST BODY: ${bodyPreview}${options.body.toString().length > 200 ? '...' : ''}`);
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            console.log(`📨 API RESPONSE: ${response.status} ${response.statusText}`);
            console.log(`📨 RESPONSE HEADERS: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
            
            // For 401 responses, user needs to re-authenticate
            // Convex handles token refresh automatically on the frontend
            if (response.status === 401) {
                console.log(`❌ AUTHENTICATION FAILED: JWT token rejected by Convex`);
                console.log(`ℹ️ User may need to sign in again`);
            }

            // Log response body for debugging if it's not successful
            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                
                if (contentType?.includes('text/html')) {
                    const htmlResponse = await response.clone().text();
                    console.log(`❌ HTML ERROR RESPONSE: ${htmlResponse.substring(0, 500)}...`);
                } else {
                    const errorText = await response.clone().text();
                    console.log(`❌ ERROR RESPONSE BODY: ${errorText}`);
                }
            }
            
            return response;
        } catch (error: any) {
            console.log(`❌ NETWORK ERROR: ${method} ${url} failed`);
            console.log(`❌ ERROR DETAILS:`, error);
            
            if (error.cause) {
                console.log(`❌ ERROR CAUSE:`, error.cause);
            }
            
            if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
                console.log(`❌ CONNECTION REFUSED: Is the server running at ${this.apiUrl}?`);
            }
            
            throw error;
        }
    }
    
    public isAuthenticated(): boolean {
        return !!this.authToken;
    }
    
    public async refreshAuth(): Promise<boolean> {
        return await this.initialize();
    }

}