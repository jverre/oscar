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
exports.AuthManager = void 0;
const vscode = __importStar(require("vscode"));
class AuthManager {
    static TOKEN_KEY = 'oscar.authToken';
    static USER_KEY = 'oscar.user';
    context;
    authToken;
    user;
    constructor(context) {
        this.context = context;
    }
    async initialize() {
        try {
            this.authToken = await this.context.secrets.get(AuthManager.TOKEN_KEY);
            const userString = await this.context.secrets.get(AuthManager.USER_KEY);
            if (userString) {
                this.user = JSON.parse(userString);
            }
            return !!this.authToken;
        }
        catch (error) {
            console.error('Failed to initialize auth manager:', error);
            return false;
        }
    }
    async signIn() {
        try {
            const config = vscode.workspace.getConfiguration('oscar');
            const serverUrl = config.get('serverUrl', 'http://localhost:3000');
            // Create the OAuth URL (no state needed for polling approach)
            const authUrl = `${serverUrl}/auth/vscode`;
            // Open the browser
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));
            // Poll for authentication status
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Signing in to Oscar...',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ message: 'Complete authentication in your browser...' });
                return this.pollForAuth(serverUrl, token);
            });
            if (result) {
                vscode.window.showInformationMessage('Successfully signed in to Oscar!');
                return true;
            }
            return false;
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to sign in to Oscar: ${error}`);
            return false;
        }
    }
    async pollForAuth(serverUrl, cancellationToken) {
        const maxAttempts = 36; // 3 minutes max (5 seconds * 36)
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (cancellationToken.isCancellationRequested) {
                throw new Error('Authentication cancelled');
            }
            try {
                const response = await fetch(`${serverUrl}/api/auth/session`);
                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        const data = await response.json();
                        if (data.user) {
                            // User is authenticated, store the token
                            await this.context.secrets.store(AuthManager.TOKEN_KEY, 'authenticated');
                            this.authToken = 'authenticated';
                            this.user = data.user;
                            await this.context.secrets.store(AuthManager.USER_KEY, JSON.stringify(data.user));
                            return true;
                        }
                    }
                    else {
                        console.log('Received non-JSON response, continuing to poll...');
                    }
                }
                else if (response.status === 401) {
                    // Not authenticated yet, continue polling
                    console.log(`Attempt ${attempt + 1}: Not authenticated yet`);
                }
                else {
                    console.log(`Attempt ${attempt + 1}: Unexpected status ${response.status}`);
                }
            }
            catch (error) {
                // Continue polling on error, but log it
                console.log(`Auth polling error (attempt ${attempt + 1}):`, error);
                // If it's the first few attempts and we're getting connection errors,
                // the server might not be running
                if (attempt < 3 && error instanceof TypeError) {
                    console.log('Connection error - is Oscar running on localhost:3000?');
                }
            }
            // Wait 5 seconds before next attempt
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        throw new Error('Authentication timed out. Make sure Oscar is running and you completed authentication in the browser.');
    }
    async signOut() {
        try {
            await this.context.secrets.delete(AuthManager.TOKEN_KEY);
            await this.context.secrets.delete(AuthManager.USER_KEY);
            this.authToken = undefined;
            this.user = undefined;
            vscode.window.showInformationMessage('Successfully signed out of Oscar.');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to sign out: ${error}`);
        }
    }
    isAuthenticated() {
        return !!this.authToken;
    }
    getAuthToken() {
        return this.authToken;
    }
    getUser() {
        return this.user;
    }
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.authToken) {
            throw new Error('Not authenticated');
        }
        const headers = {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        };
        return fetch(url, {
            ...options,
            headers
        });
    }
}
exports.AuthManager = AuthManager;
//# sourceMappingURL=authManager.js.map