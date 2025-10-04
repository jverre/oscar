import { claudeCode } from 'ai-sdk-provider-claude-code';
import express, { Request, Response } from 'express';
import cors from 'cors';
import * as pty from 'node-pty';
import { WebSocketServer, WebSocket } from 'ws';
import { readChat, deleteChat, saveChat, saveStreamChunk, readStreamChunks } from './utils/chat-store';
import {
    convertToModelMessages,
    generateId,
    streamText,
  } from 'ai';
import { MyUIMessage } from './utils/chat-schema';

const app = express();

// Simplest CORS configuration - handles pre-flight automatically
app.use(cors({
    origin: ['http://localhost:3000', 'https://www.getoscar.ai'],
    credentials: true
}));

app.use(express.json())
const port = process.env.PORT || 43021;

const model = claudeCode('opus');

interface chatMessageRequest {
    message: MyUIMessage | undefined;
    id: string;
  }

// Store active terminal sessions (PTY-based for WebSocket)
const ptyTerminals = new Map<string, pty.IPty>();

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

app.delete('/chat/:id', (req: Request<{id: string}>, res: Response) => {
    const {id} = req.params;
    deleteChat(id);
    res.status(204).send();
});

app.post('/chat', (req: Request<{}, {}, chatMessageRequest>, res: Response) => {
    const {message, id} = req.body

    const chat = readChat(id);
    let messages = chat?.messages || [];

    messages = [...messages, message!];
    saveChat({ id, messages, activeStreamId: null });

    const result = streamText({
        model: model,
        messages: convertToModelMessages(messages)
    });

    result.pipeUIMessageStreamToResponse(res, {
        onFinish: ({ messages }) => {
            // this differs slightly from the 
            const chat = readChat(id);
            messages = messages.map(message => {
                message.id = generateId();
                return message;
            });

            const finalMessages = [...chat!.messages, ...messages.map(message => message as MyUIMessage)];
            saveChat({ id, messages: finalMessages, activeStreamId: null });
        },
        consumeSseStream: async ({ stream }: { stream: ReadableStream<string> }) => {
            const streamId = generateId();
            
            // Update the chat with the active stream ID
            saveChat({ id, activeStreamId: streamId });
            
            // Store the stream chunks
            const reader = stream.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                saveStreamChunk({ streamId, chunk: value });
            }
        }
    });
  });

app.get('/chat/:id', (req: Request<{id: string}>, res: Response) => {
    const {id} = req.params;
    const chat = readChat(id);
    res.json(chat);
});


app.get('/chat/:id/stream', (req: Request<{id: string}>, res: Response) => {
    const {id} = req.params;
    const chat = readChat(id);
    if (!chat?.activeStreamId) {
        return res.status(204).send();
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',  // Disable Nginx buffering
    });

    const chunks = readStreamChunks(chat.activeStreamId);
    let chunkLength = chunks.length;

    for (const chunk of chunks) {
        res.write(`data: ${chunk}\n\n`);
    }

    const pollInterval = setInterval(() => {
        const chat = readChat(id);
        if (!chat) {
            clearInterval(pollInterval);
            return res.end();
        }
        if (!chat.activeStreamId) {
            clearInterval(pollInterval);
            return res.end();
        }

        // We need to make sure we only send the new chunks
        let chunks = readStreamChunks(chat.activeStreamId);

        for (let i = chunkLength; i < chunks.length; i++) {
            res.write(`data: ${chunks[i]}\n\n`);
        }
        chunkLength = chunks.length;
    }, 100);
});


const server = app.listen(port, () => {
console.log(`Server running at http://localhost:${port}`);
});

// WebSocket server for terminal
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://localhost:${port}`);

    // Only handle /ws path for terminal
    if (!url.pathname.startsWith('/ws')) {
        ws.close(1008, 'Invalid path');
        return;
    }

    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
        ws.close(1008, 'sessionId required');
        return;
    }

    // Get or create PTY for this session
    let terminal = ptyTerminals.get(sessionId);

    if (!terminal) {
        const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
        terminal = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.cwd(),
            env: process.env as { [key: string]: string }
        });

        ptyTerminals.set(sessionId, terminal);

        // Forward terminal output to WebSocket
        terminal.onData((data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        terminal.onExit(() => {
            ptyTerminals.delete(sessionId);
            ws.close();
        });
    }

    // Forward WebSocket input to terminal
    ws.on('message', (data) => {
        if (terminal) {
            terminal.write(data.toString());
        }
    });

    ws.on('close', () => {
        // Keep terminal alive even if WebSocket disconnects
        // It will be reused if they reconnect with same sessionId
    });
});