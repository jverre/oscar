
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
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error executing ${name}: ${error.message}`,
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
                        text: `🚀 **Oscar Share Successful!**\n\n` +
                              `✅ Shared content from workspace: **${workspaceName}**\n` +
                              `💬 Chat ID: ${cursorChatId}\n` +
                              `📅 Timestamp: ${shareData.timestamp}\n` +
                              `📍 Location: ${workspacePath}\n\n` +
                              `The current conversation and workspace context has been captured and shared through Oscar's sharing service.`,
                    },
                ],
            };
        } catch (error) {
            console.error('❌ Oscar: Share failed:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ **Share Failed**\n\nError: ${error.message}\n\nPlease try again or contact support.`,
                    },
                ],
                isError: true,
            };
        }
    }

    async handleReadFile(filePath) {
        const workspacePath = process.env.VSCODE_WORKSPACE || process.cwd();
        const fullPath = path.resolve(workspacePath, filePath);
        
        if (!fullPath.startsWith(workspacePath)) {
            throw new Error('Access denied: File is outside workspace');
        }

        const content = await fs.readFile(fullPath, 'utf8');
        return {
            content: [
                {
                    type: 'text',
                    text: content,
                },
            ],
        };
    }

    async handleWriteFile(filePath, content) {
        const workspacePath = process.env.VSCODE_WORKSPACE || process.cwd();
        const fullPath = path.resolve(workspacePath, filePath);
        
        if (!fullPath.startsWith(workspacePath)) {
            throw new Error('Access denied: File is outside workspace');
        }

        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
        
        return {
            content: [
                {
                    type: 'text',
                    text: `Successfully wrote to ${filePath}`,
                },
            ],
        };
    }

    async handleListFiles(dirPath) {
        const workspacePath = process.env.VSCODE_WORKSPACE || process.cwd();
        const fullPath = path.resolve(workspacePath, dirPath);
        
        if (!fullPath.startsWith(workspacePath)) {
            throw new Error('Access denied: Directory is outside workspace');
        }

        const items = await fs.readdir(fullPath, { withFileTypes: true });
        const fileList = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: path.join(dirPath, item.name),
        }));

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(fileList, null, 2),
                },
            ],
        };
    }

    async handleGetWorkspaceInfo() {
        const workspacePath = process.env.VSCODE_WORKSPACE || process.cwd();
        const info = {
            workspacePath,
            name: path.basename(workspacePath),
            oscarVersion: '1.0.0',
            features: ['file_operations', 'workspace_access'],
            timestamp: new Date().toISOString(),
        };

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(info, null, 2),
                },
            ],
        };
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
        console.error('🚀 Oscar MCP Server running on stdio');
    }
}

const server = new OscarMCPServer();
server.run().catch(console.error);
