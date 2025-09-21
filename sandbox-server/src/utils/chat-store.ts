import { generateId } from 'ai';
import { ChatData, MyUIMessage } from './chat-schema';
const Database = require('better-sqlite3');

// Get or create the database file
const db_options = {}
const db = new Database('./chats.db', db_options);

// Create the required tables if needed
db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        messages TEXT,
        createdAt INTEGER,
        activeStreamId TEXT
    );
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS stream_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_id TEXT NOT NULL,
      chunk TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

const createChatStatement = db.prepare(`
    INSERT INTO chats (id, messages, createdAt)
    VALUES (?, ?, ?)
`);

const readChatStatement = db.prepare(`
    SELECT id, messages, createdAt
    FROM chats
    WHERE id = ?
`);

const updateChatStatement = db.prepare(`
    UPDATE chats
    SET messages = ?, activeStreamId = ?
    WHERE id = ?
`);

const readStreamChunksStatement = db.prepare(`
    SELECT chunk
    FROM stream_chunks
    WHERE stream_id = ?
    order by created_at asc
`);

export function createChat(): string {
    const id = generateId();
    createChatStatement.run(id, JSON.stringify([]), Date.now());
    return id;
}

export function readChat(id: string): ChatData | null {
    const result = readChatStatement.get(id);
    if (!result) {
        return null;
    }

    return {
        id: result.id,
        messages: JSON.parse(result.messages),
        createdAt: result.createdAt,
        activeStreamId: null
    };
}

export function saveChat({
    id,
    activeStreamId,
    messages
}: {
    id: string
    activeStreamId?: string | null
    messages?: MyUIMessage[]
}) {
    let chat = readChat(id);
    if (!chat) {
        chat = {
            id: id,
            messages: [],
            createdAt: Date.now(),
            activeStreamId: null
        };
    }

    if (messages !== undefined) {
        chat.messages = messages;
    }

    if (activeStreamId !== undefined) {
        chat.activeStreamId = activeStreamId;
    }

    updateChatStatement.run(chat.id, JSON.stringify(chat.messages), chat.activeStreamId);
}

export function saveStreamChunk({
    streamId,
    chunk
}: {
    streamId: string
    chunk: string
}) {
    const insertChunk = db.prepare(`
        INSERT INTO stream_chunks (stream_id, chunk, created_at)
        VALUES (?, ?, ?)
    `);
    insertChunk.run(streamId, chunk, Date.now());
}

export function readStreamChunks(streamId: string): string[] {
    const result = readStreamChunksStatement.all(streamId);
    return result.map((row: { chunk: string }) => row.chunk);
}