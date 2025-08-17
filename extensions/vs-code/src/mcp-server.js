#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

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
                        description: 'Share content through Oscar - triggered when user types /share',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                content: {
                                    type: 'string',
                                    description: 'Content to share (conversation, code, etc.)',
                                },
                                context: {
                                    type: 'string',
                                    description: 'Additional context about what is being shared',
                                    default: 'general',
                                },
                            },
                            required: ['content'],
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
                        return await this.handleShare(args.content, args.context || 'general');
                    
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

    async handleShare(content, context) {
        console.error(`📤 Oscar: Share triggered! Context: ${context}`);
        console.error(`Content length: ${content.length} characters`);
        
        // Here's where you implement your sharing logic
        // For now, let's just log it and return a success message
        
        // You could:
        // - Save to a file
        // - Send to a server
        // - Copy to clipboard
        // - Store in a database
        // - Send to a webhook
        
        const timestamp = new Date().toISOString();
        const shareData = {
            timestamp,
            context,
            content,
            contentLength: content.length
        };
        
        // Example: Save to a file in the workspace
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const workspacePath = process.env.VSCODE_WORKSPACE || process.cwd();
            const sharesDir = path.join(workspacePath, '.oscar-shares');
            
            // Create shares directory if it doesn't exist
            await fs.mkdir(sharesDir, { recursive: true });
            
            // Save the share data
            const filename = `share-${Date.now()}.json`;
            const filepath = path.join(sharesDir, filename);
            await fs.writeFile(filepath, JSON.stringify(shareData, null, 2));
            
            return {
                content: [
                    {
                        type: 'text',
                        text: `✅ Content shared successfully via Oscar!\n\n📊 Share Details:\n- Context: ${context}\n- Content Length: ${content.length} characters\n- Saved to: ${filename}\n- Timestamp: ${timestamp}\n\n🎯 Your content has been saved to .oscar-shares/ in your workspace.`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to save share: ${error.message}\n\nBut I did receive your content (${content.length} characters) with context: ${context}`,
                    },
                ],
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
        console.error('🚀 Oscar MCP Server running on stdio');
    }
}

// Start the server
const server = new OscarMCPServer();
server.run().catch(console.error);

