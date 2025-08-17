import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

// MCP Server implementation
class MCPServer {
    private context: vscode.ExtensionContext;
    private serverProcess: ChildProcess | null = null;
    private isRunning: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            vscode.window.showWarningMessage('Oscar MCP Server is already running');
            return;
        }

        try {
            // Create MCP server script if it doesn't exist
            await this.createMCPServerScript();
            
            // Start the MCP server process
            const serverScriptPath = path.join(this.context.extensionPath, 'mcp-server.js');
            this.serverProcess = spawn('node', [serverScriptPath], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: this.context.extensionPath,
                env: {
                    ...process.env,
                    VSCODE_WORKSPACE: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
                }
            });

            this.serverProcess.stdout?.on('data', (data) => {
                console.log(`MCP Server stdout: ${data}`);
            });

            this.serverProcess.stderr?.on('data', (data) => {
                console.error(`MCP Server stderr: ${data}`);
            });

            this.serverProcess.on('close', (code) => {
                console.log(`MCP Server process exited with code ${code}`);
                this.isRunning = false;
                this.serverProcess = null;
            });

            this.isRunning = true;
            vscode.window.showInformationMessage('🚀 Oscar MCP Server started successfully!');

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start MCP Server: ${error}`);
            console.error('MCP Server start error:', error);
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning || !this.serverProcess) {
            vscode.window.showWarningMessage('Oscar MCP Server is not running');
            return;
        }

        this.serverProcess.kill('SIGTERM');
        this.isRunning = false;
        this.serverProcess = null;
        vscode.window.showInformationMessage('🛑 Oscar MCP Server stopped');
    }

    public getStatus(): { running: boolean; pid?: number } {
        return {
            running: this.isRunning,
            pid: this.serverProcess?.pid
        };
    }

    private async createMCPServerScript(): Promise<void> {
        const serverScript = `
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs').promises;
const path = require('path');

class OscarMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'oscar-vscode-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
        this.setupErrorHandling();
    }

    setupToolHandlers() {
        // List available tools - just the /share tool
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'share',
                        description: 'Automatically triggered when user types "/share" - captures and shares the current conversation, code, or content through Oscar sharing service.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                cursor_chat_id: {
                                    type: 'string',
                                    description: 'The unique identifier for the current Cursor chat session',
                                }
                            },
                            required: ['cursor_chat_id'],
                        },
                    },
                ],
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'share':
                        return await this.handleShare(args.cursor_chat_id);
                    
                    default:
                        throw new Error(\`Unknown tool: \${name}\`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: \`Error executing \${name}: \${error.message}\`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    async handleShare(cursorChatId) {
        console.log('🎯 Oscar MCP: /share command triggered!');
        console.log('📋 Cursor Chat ID:', cursorChatId);
        
        try {
            // Validate required parameter
            if (!cursorChatId) {
                throw new Error('cursor_chat_id is required');
            }

            // Get workspace information
            const workspacePath = process.env.VSCODE_WORKSPACE || process.cwd();
            const workspaceName = path.basename(workspacePath);
            
            // Create sharing payload
            const shareData = {
                timestamp: new Date().toISOString(),
                workspace: workspaceName,
                workspacePath: workspacePath,
                cursorChatId: cursorChatId,
                trigger: 'MCP /share command',
                message: 'Content shared via Oscar MCP server'
            };

            // Here you would implement your actual sharing logic:
            // - Send to a server with the chat ID
            // - Save to file with chat ID as identifier
            // - Copy to clipboard
            // - Upload to cloud service with chat metadata
            // etc.
            
            console.log('📤 Oscar: Sharing data:', shareData);
            
            return {
                content: [
                    {
                        type: 'text',
                        text: \`🚀 **Oscar Share Successful!**\\n\\n\` +
                              \`✅ Shared content from workspace: **\${workspaceName}**\\n\` +
                              \`💬 Chat ID: \${cursorChatId}\\n\` +
                              \`📅 Timestamp: \${shareData.timestamp}\\n\` +
                              \`📍 Location: \${workspacePath}\\n\\n\` +
                              \`The current conversation and workspace context has been captured and shared through Oscar's sharing service.\`,
                    },
                ],
            };
        } catch (error) {
            console.error('❌ Oscar: Share failed:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: \`❌ **Share Failed**\\n\\nError: \${error.message}\\n\\nPlease try again or contact support.\`,
                    },
                ],
                isError: true,
            };
        }
    }

    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Server Error]', error);
        };

        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('🎯 Oscar MCP Server running on stdio');
    }
}

const server = new OscarMCPServer();
server.run().catch(console.error);
`;

        const serverScriptPath = path.join(this.context.extensionPath, 'mcp-server.js');
        await fs.promises.writeFile(serverScriptPath, serverScript, 'utf8');
        console.log('✅ Created MCP server script:', serverScriptPath);
    }
}

// MCP Manager to handle Cursor configuration
class MCPManager {
    private context: vscode.ExtensionContext;
    private mcpServer: MCPServer;
    private cursorConfigPath: string;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.mcpServer = new MCPServer(context);
        this.cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
    }

    public async installMCPServer(): Promise<void> {
        try {
            // Start the MCP server
            await this.mcpServer.start();
            
            // Update Cursor's MCP configuration
            await this.updateCursorConfig();
            
            vscode.window.showInformationMessage(
                '🎯 Oscar MCP Server installed! Restart Cursor to use /share command.',
                'Restart Cursor'
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install MCP server: ${error}`);
        }
    }

    public async removeMCPServer(): Promise<void> {
        try {
            // Stop the MCP server
            await this.mcpServer.stop();
            
            // Remove from Cursor's configuration
            await this.removeCursorConfig();
            
            vscode.window.showInformationMessage('🗑️ Oscar MCP Server removed from Cursor config');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to remove MCP server: ${error}`);
        }
    }

    private async updateCursorConfig(): Promise<void> {
        try {
            // Read current MCP config
            let mcpConfig: any = { mcpServers: {} };
            
            if (fs.existsSync(this.cursorConfigPath)) {
                const configContent = await fs.promises.readFile(this.cursorConfigPath, 'utf8');
                mcpConfig = JSON.parse(configContent);
            }

            // Add Oscar MCP server configuration
            const serverScriptPath = path.join(this.context.extensionPath, 'mcp-server.js');
            mcpConfig.mcpServers.oscar = {
                command: 'node',
                args: [serverScriptPath],
                env: {
                    VSCODE_WORKSPACE: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
                }
            };

            // Write updated config
            await fs.promises.writeFile(
                this.cursorConfigPath, 
                JSON.stringify(mcpConfig, null, 2),
                'utf8'
            );

            console.log('✅ Updated Cursor MCP config:', this.cursorConfigPath);
        } catch (error) {
            throw new Error(`Failed to update Cursor config: ${error}`);
        }
    }

    private async removeCursorConfig(): Promise<void> {
        try {
            if (!fs.existsSync(this.cursorConfigPath)) {
                return;
            }

            // Read current MCP config
            const configContent = await fs.promises.readFile(this.cursorConfigPath, 'utf8');
            const mcpConfig = JSON.parse(configContent);

            // Remove Oscar server
            if (mcpConfig.mcpServers && mcpConfig.mcpServers.oscar) {
                delete mcpConfig.mcpServers.oscar;
                
                // Write updated config
                await fs.promises.writeFile(
                    this.cursorConfigPath,
                    JSON.stringify(mcpConfig, null, 2),
                    'utf8'
                );
                
                console.log('✅ Removed Oscar from Cursor MCP config');
            }
        } catch (error) {
            throw new Error(`Failed to remove from Cursor config: ${error}`);
        }
    }
}

// Main extension activation
export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 Oscar MCP Extension activated');

    const mcpManager = new MCPManager(context);

    // Register commands
    const installCommand = vscode.commands.registerCommand('oscar.installMCP', () => {
        mcpManager.installMCPServer();
    });

    const removeCommand = vscode.commands.registerCommand('oscar.removeMCP', () => {
        mcpManager.removeMCPServer();
    });

    const shareCommand = vscode.commands.registerCommand('oscar.share', () => {
        handleShareCommand('Manual share command triggered');
    });

    const helloCommand = vscode.commands.registerCommand('oscar.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from Oscar MCP Server! 🚀');
    });

    // Register all commands
    context.subscriptions.push(
        installCommand,
        removeCommand,
        shareCommand,
        helloCommand
    );
}

function handleShareCommand(text: string) {
    console.log('🎯 Oscar: Share command triggered:', text);
    
    // Get current editor content
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const content = editor.document.getText();
        console.log('📄 Content to share:', content);
        
        // Here you would implement your sharing logic
        vscode.window.showInformationMessage(`Oscar: Sharing content - ${text}`);
    }
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('Oscar extension deactivated');
}
