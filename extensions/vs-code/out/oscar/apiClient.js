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
exports.OscarApiClient = void 0;
const vscode = __importStar(require("vscode"));
class OscarApiClient {
    authToken;
    sessionId;
    authUrl;
    apiUrl;
    constructor() {
        const config = vscode.workspace.getConfiguration('oscar');
        this.authUrl = config.get('authUrl', 'http://localhost:3000');
        this.apiUrl = config.get('apiUrl', 'https://accomplished-koala-846.convex.site');
    }
    async initialize() {
        try {
            // Get authentication session
            const session = await vscode.authentication.getSession('oscar', ['read'], { silent: true });
            if (!session) {
                return false;
            }
            this.authToken = session.accessToken;
            this.sessionId = session.id;
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async claudeCodeBatchLog(request) {
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
        const result = await response.json();
        console.log(`✅ CLAUDE CODE BATCH LOG SUCCESS: Created/updated file ${result.fileId} with ${result.messagesCreated} messages`);
        return result;
    }
    async makeRequest(endpoint, options = {}) {
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
                }
                else {
                    const errorText = await response.clone().text();
                    console.log(`❌ ERROR RESPONSE BODY: ${errorText}`);
                }
            }
            return response;
        }
        catch (error) {
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
    isAuthenticated() {
        return !!this.authToken;
    }
    async refreshAuth() {
        return await this.initialize();
    }
}
exports.OscarApiClient = OscarApiClient;
//# sourceMappingURL=apiClient.js.map