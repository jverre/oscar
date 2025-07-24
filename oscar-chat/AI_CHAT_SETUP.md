# AI Chat Integration Setup Guide

This guide covers the AI SDK + Convex integration that has been implemented in the Oscar chat application.

## 🎯 What's Implemented

### ✅ Core Features
- **AI Chat Interface**: Integrated into the PluginBuilder component sidebar
- **Message Persistence**: All chat messages are stored in Convex database
- **Real-time Updates**: Live chat history syncing across sessions
- **Multi-tenant Support**: Chats are scoped to organizations and users
- **Streaming Responses**: Real-time AI responses using AI SDK's streaming
- **Plugin Context**: Chats can be associated with specific plugins

### ✅ Technical Implementation
- **AI SDK Integration**: Uses `@ai-sdk/react` for chat UI and `@ai-sdk/openai` for AI provider
- **Convex Backend**: Real-time database with automatic syncing
- **NextAuth Integration**: Proper authentication and user/organization context
- **TypeScript Support**: Full type safety throughout the implementation

## 📋 Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the `oscar-chat` directory:

```bash
# Required: OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here

# Already configured by Convex
NEXT_PUBLIC_CONVEX_URL=your-convex-url-here
```

### 2. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env.local` file

### 3. Deploy Schema Changes

The necessary schema changes have been added to `convex/schema.ts`. Deploy them:

```bash
cd oscar-chat
npx convex dev
```

### 4. Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to a plugin in the PluginBuilder
3. The chat sidebar should appear on the right
4. Sign in and join an organization to use the chat
5. Create a new chat and start asking questions

## 🏗️ Architecture Overview

### Database Schema

```typescript
// New tables added to convex/schema.ts
chats: {
  chatId: string,           // AI SDK generated ID
  title: string,            // Chat title
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  pluginId?: Id<"plugins">, // Optional plugin association
  createdAt: number,
  updatedAt: number,
}

chatMessages: {
  chatId: string,
  messages: Array<{         // AI SDK Message format
    id: string,
    role: "user" | "assistant",
    content: string,
    createdAt?: number,
  }>,
  updatedAt: number,
}
```

### API Route

- **Endpoint**: `/api/chat`
- **Method**: POST
- **Streaming**: Uses AI SDK's `streamText` for real-time responses
- **Persistence**: Automatically saves messages to Convex after completion

### React Components

- **PluginBuilder**: Main container with resizable chat sidebar
- **ChatSidebar**: Full chat interface with history and input
- **Authentication**: Integrated with NextAuth for user/org context

## 🎮 Usage

### Starting a Chat

1. Click the "+" button in the chat sidebar header
2. A new chat will be created and selected
3. Type your question in the input field
4. Press Enter or click the send button

### Chat Features

- **Real-time Streaming**: AI responses appear in real-time
- **Message History**: All conversations are preserved
- **Multi-chat Support**: Switch between multiple conversations
- **Plugin Context**: Each chat can be associated with a plugin
- **Organization Scoped**: Chats are private to your organization

### Chat Interface

```
┌─────────────────────────────────────┐
│ 💬 AI Chat                     [+] │
├─────────────────────────────────────┤
│ Chat 1                             │
│ Chat 2                             │
│ Chat 3                             │
├─────────────────────────────────────┤
│ You: How do I create a plugin?     │
│ AI: To create a plugin, you need.. │
│                                    │
│ AI is thinking...                  │
├─────────────────────────────────────┤
│ [Ask about your plugin...    ] [↑] │
└─────────────────────────────────────┘
```

## 🔧 Development Notes

### Key Files Modified/Created

```
oscar-chat/
├── convex/
│   ├── schema.ts           # Added chat tables
│   └── chats.ts           # New chat functions
├── src/
│   ├── app/api/chat/      # AI streaming endpoint
│   │   └── route.ts
│   └── components/plugins/
│       └── PluginBuilder.tsx # Updated with chat
└── AI_CHAT_SETUP.md       # This file
```

### Dependencies Added

```json
{
  "ai": "^latest",
  "@ai-sdk/react": "^latest", 
  "@ai-sdk/openai": "^latest",
  "zod": "^latest"
}
```

### Performance Considerations

- **Streaming**: AI responses stream in real-time for better UX
- **Caching**: Convex provides automatic caching and invalidation
- **Optimistic Updates**: UI updates immediately with streaming responses
- **Efficient Queries**: Only active chat messages are loaded

## 🐛 Troubleshooting

### Common Issues

1. **"Please sign in to use AI chat"**
   - Ensure you're logged in with NextAuth
   - Check session in browser dev tools

2. **"Organization access required"**
   - Join an organization through the app
   - Verify organization setup in database

3. **AI responses not working**
   - Check OpenAI API key is set correctly
   - Verify API key has sufficient credits
   - Check console for API errors

4. **Messages not persisting**
   - Ensure Convex is running (`npx convex dev`)
   - Check database schema is deployed
   - Verify network connection

### Debug Tips

- Check browser console for errors
- Use Convex dashboard to inspect database
- Verify environment variables are loaded
- Test API endpoint directly if needed

## 🚀 Next Steps

### Potential Enhancements

1. **Plugin-Specific AI Context**
   - Add plugin code/docs to AI context
   - Plugin-specific prompts and responses

2. **Advanced Features**
   - File attachments
   - Code execution
   - Plugin preview integration

3. **Chat Management**
   - Delete conversations
   - Export chat history
   - Search within chats

4. **Performance Optimization**
   - Message pagination
   - Lazy loading
   - Background sync

## 📖 Resources

- [AI SDK Documentation](https://ai-sdk.dev/)
- [Convex Documentation](https://docs.convex.dev/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [NextAuth Documentation](https://next-auth.js.org/)

## 🤝 Contributing

When working on the AI chat features:

1. Follow the existing patterns for Convex queries/mutations
2. Maintain TypeScript type safety
3. Test with real authentication flow
4. Consider multi-tenant implications
5. Update this README with any changes

---

The AI chat integration is now fully functional and ready to use! 🎉 