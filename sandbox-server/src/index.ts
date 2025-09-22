import { claudeCode } from 'ai-sdk-provider-claude-code';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { readChat, createChat, saveChat, saveStreamChunk, readStreamChunks } from './utils/chat-store';
import {
    convertToModelMessages,
    generateId,
    streamText,
  } from 'ai';
import { MyUIMessage } from './utils/chat-schema';

const app = express();
app.use(cors(
    {
        origin: 'http://localhost:3000',
        methods: ['POST', 'GET'],
        allowedHeaders: ['Content-Type'],
    }
));
app.use(express.json())
const port = process.env.PORT || 3001;

const model = claudeCode('opus');

interface chatMessageRequest {
    message: MyUIMessage | undefined;
    id: string;
  }

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

app.listen(port, () => {
console.log(`Server running at http://localhost:${port}`);
});