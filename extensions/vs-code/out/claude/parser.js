"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeSessionParser = void 0;
class ClaudeSessionParser {
    static parseSession(sessionId, jsonlContent) {
        console.log(`🔍 Parsing Claude session: ${sessionId}`);
        const lines = jsonlContent.trim().split('\n').filter(line => line.trim());
        const messages = [];
        let projectPath = '';
        let cwd = '';
        let version = '';
        const models = new Set();
        let toolUses = 0;
        let userMessages = 0;
        let assistantMessages = 0;
        for (const line of lines) {
            try {
                const rawMessage = JSON.parse(line);
                // Skip summary entries that don't have the expected message structure
                if (rawMessage.type === 'summary' || !rawMessage.message) {
                    continue;
                }
                const parsedMessage = this.parseMessage(rawMessage);
                messages.push(parsedMessage);
                // Extract metadata
                if (parsedMessage.cwd && !cwd) {
                    cwd = parsedMessage.cwd;
                    projectPath = this.extractProjectPath(parsedMessage.cwd);
                }
                if (parsedMessage.version && !version) {
                    version = parsedMessage.version;
                }
                if (parsedMessage.model) {
                    models.add(parsedMessage.model);
                }
                if (parsedMessage.toolUses) {
                    toolUses += parsedMessage.toolUses.length;
                }
                if (parsedMessage.type === 'user') {
                    userMessages++;
                }
                else if (parsedMessage.type === 'assistant') {
                    assistantMessages++;
                }
            }
            catch (error) {
                console.log(`⚠️ Failed to parse message line: ${line.substring(0, 100)}...`, error);
            }
        }
        // Calculate time range
        const timestamps = messages.map(m => m.timestamp).sort((a, b) => a.getTime() - b.getTime());
        const startTime = timestamps[0] || new Date();
        const endTime = timestamps[timestamps.length - 1] || new Date();
        const session = {
            sessionId,
            projectPath,
            cwd,
            version,
            messages,
            metadata: {
                totalMessages: messages.length,
                userMessages,
                assistantMessages,
                startTime,
                endTime,
                models: Array.from(models),
                toolUses
            }
        };
        console.log(`✅ Parsed session ${sessionId}: ${messages.length} messages, ${models.size} models, ${toolUses} tool uses`);
        return session;
    }
    static parseMessage(rawMessage) {
        // Extract content from message
        let content = '';
        const toolUses = [];
        // Safety check for message content
        if (!rawMessage.message || !rawMessage.message.content) {
            console.log(`⚠️ Message missing content: ${rawMessage.uuid}`);
            content = '';
        }
        else if (typeof rawMessage.message.content === 'string') {
            content = rawMessage.message.content;
        }
        else if (Array.isArray(rawMessage.message.content)) {
            // Handle structured content - create string representation for UI but preserve structure in metadata
            const structuredContent = [];
            let textContent = '';
            for (const block of rawMessage.message.content) {
                if (block.type === 'text') {
                    structuredContent.push({
                        type: 'text',
                        text: block.text || ''
                    });
                    textContent += block.text || '';
                }
                else if (block.type === 'tool_use') {
                    structuredContent.push({
                        type: 'tool-call',
                        toolCallId: block.id,
                        toolName: block.name,
                        args: block.input
                    });
                    toolUses.push({
                        id: block.id,
                        name: block.name,
                        input: block.input
                    });
                    textContent += `\n\n:::tool-call{name="${block.name}" id="${block.id}"}\n${JSON.stringify(block.input, null, 2)}\n:::\n`;
                }
                else if (block.type === 'tool_result') {
                    structuredContent.push({
                        type: 'tool-result',
                        toolCallId: block.tool_use_id || block.id || '',
                        toolName: block.name || 'unknown',
                        result: block.content || '',
                        isError: block.isError
                    });
                    const resultText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
                    textContent += `\n\n:::tool-result{id="${block.tool_use_id || block.id || ''}"}\n${resultText}\n:::\n`;
                }
            }
            // Store as string content for UI compatibility, structured content in metadata
            content = textContent.trim();
        }
        return {
            uuid: rawMessage.uuid || 'unknown',
            parentUuid: rawMessage.parentUuid,
            sessionId: rawMessage.sessionId || 'unknown',
            timestamp: new Date(rawMessage.timestamp || Date.now()),
            type: rawMessage.type || 'user',
            role: rawMessage.message?.role || rawMessage.type || 'user',
            content: content.trim(),
            model: rawMessage.message?.model,
            cwd: rawMessage.cwd,
            version: rawMessage.version,
            isStreaming: rawMessage.isStreaming,
            isSidechain: rawMessage.isSidechain,
            userType: rawMessage.userType,
            requestId: rawMessage.requestId,
            toolUses: toolUses.length > 0 ? toolUses : undefined,
            metadata: this.extractMessageMetadata(rawMessage)
        };
    }
    static extractMessageMetadata(rawMessage) {
        const metadata = {};
        // Extract usage information if available
        if (rawMessage.message.usage) {
            const usage = rawMessage.message.usage;
            metadata.tokenCount = usage.input_tokens + (usage.output_tokens || 0);
        }
        // Extract stop reason if available
        if (rawMessage.message.stop_reason) {
            metadata.stopReason = rawMessage.message.stop_reason;
        }
        // Extract any error information
        if (rawMessage.error) {
            metadata.error = rawMessage.error;
        }
        // Store structured content if it exists (for potential future use)
        if (Array.isArray(rawMessage.message?.content)) {
            metadata.hasStructuredContent = true;
            metadata.structuredContent = rawMessage.message.content;
        }
        return Object.keys(metadata).length > 0 ? metadata : undefined;
    }
    static extractProjectPath(cwd) {
        // Extract a clean project name from the current working directory
        const parts = cwd.replace(/\\/g, '/').split('/');
        // Look for common project indicators
        const projectIndicators = ['Projects', 'Code', 'Development', 'src', 'workspace'];
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i];
            if (projectIndicators.some(indicator => parts[i - 1]?.includes(indicator))) {
                return part;
            }
        }
        // If no project indicator found, use the last directory name
        return parts[parts.length - 1] || 'Unknown Project';
    }
    static buildMessageThread(messages) {
        // Group messages by conversation thread (using parentUuid)
        const threads = [];
        const messageMap = new Map();
        // First pass: create message map
        for (const message of messages) {
            messageMap.set(message.uuid, message);
        }
        // Second pass: build threads
        const processedMessages = new Set();
        for (const message of messages) {
            if (processedMessages.has(message.uuid)) {
                continue;
            }
            // Start a new thread from root messages (no parent)
            if (!message.parentUuid) {
                const thread = this.buildThreadFromRoot(message, messageMap, processedMessages);
                if (thread.length > 0) {
                    threads.push(thread);
                }
            }
        }
        // Handle any orphaned messages
        for (const message of messages) {
            if (!processedMessages.has(message.uuid)) {
                threads.push([message]);
                processedMessages.add(message.uuid);
            }
        }
        return threads;
    }
    static buildThreadFromRoot(rootMessage, messageMap, processedMessages) {
        const thread = [];
        const queue = [rootMessage];
        while (queue.length > 0) {
            const current = queue.shift();
            if (processedMessages.has(current.uuid)) {
                continue;
            }
            thread.push(current);
            processedMessages.add(current.uuid);
            // Find children of current message
            for (const [, message] of messageMap) {
                if (message.parentUuid === current.uuid && !processedMessages.has(message.uuid)) {
                    queue.push(message);
                }
            }
        }
        // Sort thread by timestamp
        thread.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        return thread;
    }
}
exports.ClaudeSessionParser = ClaudeSessionParser;
//# sourceMappingURL=parser.js.map