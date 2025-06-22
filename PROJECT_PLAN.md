# LLM Chat Application - Project Plan

## Overview
A modern chat application that supports multiple LLM providers with cross-device sync, file uploads, and the ability to create custom MCP (Model Context Protocol) servers through an integrated development environment.

## Project Phases

### Phase 1 (MVP)
- Google authentication only
- Text chat with OpenAI, Anthropic, and Gemini
- Terminal-inspired UI (monospace fonts, dark theme)
- Basic chat history persistence

### Phase 2
- File upload support (images, PDFs, text files)
- Provider switching mid-conversation
- Cross-device sync with long-running streams

### Phase 3
- MCP server creation sandbox
- Team features
- Usage analytics and billing

## Core Technologies
- **Frontend/Backend**: Next.js 15 (App Router) with TypeScript
- **Database/Auth/Sync**: Convex
- **MCP Server Hosting**: Fly.io (Phase 3)
- **UI Style**: Terminal-inspired (monospace fonts, dark theme, minimal design)
- **Node Version**: Latest LTS (v20.x)
- **Authentication**: Google OAuth via Convex Auth

## Architecture

### 1. Frontend Architecture
- Next.js App Router for routing and SSR
- React Server Components where applicable
- Client-side state management for chat UI
- WebSocket/SSE for real-time streaming responses
- Terminal-inspired UI components (custom or libraries like xterm.js for sandbox)

### 2. Backend Architecture
- Next.js API routes for LLM provider integration
- Platform-managed API keys for LLM providers
- Convex for:
  - Google OAuth authentication
  - Chat message persistence (retained forever)
  - Real-time sync across devices
  - File storage references (Phase 2)
  - Team management (Future)
- Separate microservice on Fly.io for MCP server execution (Phase 3)

### 3. Data Flow
```
User -> Next.js Frontend -> Convex (Auth/Data) -> LLM Providers
                        |
                        -> File Upload Service
                        |
                        -> MCP Sandbox -> Fly.io Deployment
```

## Key Features Breakdown

### 1. Multi-Provider LLM Chat
- Provider abstraction layer
- Initial support for: OpenAI, Anthropic, Google Gemini
- Streaming response handling
- Token counting and usage tracking
- Mid-conversation provider switching
- No provider-specific features (unified interface)

### 2. Cross-Device Sync
- Convex real-time sync
- Persistent chat history
- Resume long-running streams
- Offline support with sync on reconnect

### 3. File Upload System (Phase 2)
- Direct file uploads to Convex storage
- Supported types: Images, PDFs, text files
- ~1MB file size limit
- Files passed directly to LLMs (no preprocessing)
- Simple file preview in chat

### 4. MCP Server Creation (Phase 3)
- In-browser code editor (Monaco)
- JavaScript/TypeScript support
- NPM package installation support
- Live preview of MCP server behavior
- Template library
- One-click deployment to Fly.io
- Resource limits (TBD)
- Private to team members
- Server management dashboard

## Security Considerations
- Platform-managed API keys (no user API key input)
- Future paid tier for increased usage
- Sandboxed code execution for MCP servers (Phase 3)
- Rate limiting based on tier
- Basic abuse prevention

## Deployment Strategy
- Vercel for Next.js application
- Convex cloud for database/sync
- Fly.io for MCP server containers (Phase 3)
- Vercel CDN for static assets

## MVP Technical Requirements

### Database Schema (Convex)
- Users table (Google OAuth data)
- Conversations table (with auto-generated names)
- Messages table (with streaming support, branch tracking)
- Future: Teams, Files, MCPServers, Organizations tables

### API Routes
- `/api/chat/[provider]` - Streaming chat endpoints
- `/api/auth/*` - Handled by Convex Auth
- `/api/conversations` - CRUD operations for conversations

### UI Components
- Terminal-style chat interface with markdown rendering
- Message list with syntax highlighting for code blocks
- Model selector (3 models max per provider)
- File system-like sidebar for conversation organization
- Conversation branching UI
- Error states with clean terminal-style messages
- Model/token/time subtitle display

### Design System
- Dark theme with high contrast whites
- Monospace font throughout
- ASCII art for branding
- Inspired by Claude Code, Cursor chat + IDE
- Optional box-drawing characters for UI elements

### Core Features for MVP
1. **Authentication**: Google OAuth only
2. **Chat Interface**:
   - Markdown rendering
   - Code syntax highlighting
   - Streaming responses
   - Conversation branching
   - Auto-naming conversations
3. **Provider Support**:
   - OpenAI (GPT-4, GPT-3.5, etc.)
   - Anthropic (Claude 3 models)
   - Google (Gemini models)
   - Provider switching mid-conversation
4. **UI/UX**:
   - File system-like conversation organization
   - Pagination for long conversations
   - Clean error handling
   - Model/token/time info display

---

## Clarifying Questions

### 1. Authentication & User Management
- Should users bring their own API keys for LLM providers, or will the platform provide them?
  * Answer: I will provide them, we will have a paying tier in the future
- What authentication methods do you want to support? (Email/password, OAuth providers like Google/GitHub?)
  * Answer: We will support only Google
- Do you need team/organization features, or is this single-user focused?
  * Answer: We are going to have teams but this is a feature for the futuer

### 2. LLM Provider Integration
- Which specific LLM providers should we prioritize for initial release?
  * OpenAI + Anthropic + Gemini
- Should users be able to switch between providers mid-conversation?
  * Yes
- How should we handle provider-specific features (e.g., Claude's artifacts, GPT's function calling)?
  * No

### 3. File Upload Functionality
- What file types should be supported? (Images, PDFs, code files, etc.)
  * Images + PDFs + text files
- What's the maximum file size you want to allow?
  * Small, around ~1MB but depends on easiest approach
- Should files be processed (e.g., OCR for images, parsing for PDFs) or just passed to LLMs that support them?
  * Just pass to LLM

### 4. MCP Server Sandbox
- What programming languages should the MCP sandbox support?
  * Javascript
- Should users be able to install npm packages or other dependencies?
  * Yes
- What are the resource limits for user-created MCP servers? (CPU, memory, execution time)
  * Yes, will have small limits (exact values are TBD)
- Should MCP servers be publicly shareable or private to the user?
  * Private to team (multiple users can have access to the same team)

### 5. UI/UX Preferences
- When you say "terminal-inspired," do you mean:
  - Monospace fonts and dark theme?
    * Yes
  - Actual terminal emulation (command-line interface)?
    * No
  - Just the aesthetic (clean, minimal, text-focused)?
    * Aesthetic + font + dark theme
- Should we support themes/customization?
  * Not for now

### 6. Technical Constraints
- Do you have a preferred Node.js version or any specific version requirements?
  * Use latest LTS version
- Any specific Convex features you want to leverage? (Scheduled functions, actions, etc.)
  * Whatever we need
- Budget considerations for Fly.io instances?
  * No budget considerations

### 7. MVP Scope
- Which features are must-haves for the initial release vs. nice-to-haves?
  * Start with just user auth + text chat with a focus on UI, UX and terminal like interface
- Should we start with a subset of features (e.g., just chat without MCP servers)?
  * Yes, just text chat

### 8. Data Privacy
- How long should chat history be retained?
  * Forever
- Should users be able to export/delete their data?
  * No
- Any compliance requirements (GDPR, etc.)?
  * No

## Additional Clarifying Questions

### 9. MVP Chat Features
- Should the chat support markdown rendering in responses?
  * Yes
- Do you want syntax highlighting for code blocks?
  * Yes
- Should we implement keyboard shortcuts (vim-style or standard)?
  * in future versions
- How should we handle errors/failed API calls visually?
  * We will display a clean error message

### 10. Conversation Management
- Should users be able to rename conversations?
  * Yes and we will create a name automaticaally based on first few messagess
- Do we need search functionality across chat history?
  * In future versions
- Should conversations have folders/tags for organization?
  * Yes, will be like a file systems
- Export functionality for conversations (even though no data deletion)?
  * No

### 11. Provider Management
- How should we handle rate limits from different providers?
  * Assume no rate limites
- Should we show which model is being used (gpt-4, claude-3, etc.)?
  * We will have a small model + token usages + time subtitle (dim color, smaller font)
- Do you want model selection within each provider?
  * No, just show all relevant models (we will show 3 max per provider)
- Cost tracking per conversation/user?
  * No

### 12. Terminal UI Specifics
- Any specific terminal emulators you like as inspiration? (Warp, iTerm2, Hyper)
  * I'm thinking Claude code, Cursor chat + IDE, etc
- Should we use ASCII art for branding/headers?
  * Yes
- Preference for color scheme? (Dracula, Nord, custom?)
  * None of these, I want something darker with whitess that pop
- Should UI elements use box-drawing characters (╭─╮ etc.)?
  * They can if we need them, we might now though

### 13. Performance & Architecture
- Should we implement response caching?
  * No
- Do you want to support conversation branching (try different responses)?
  * Yes
- Should we paginate long conversations or load everything?
  * Paginate
- Any specific performance metrics to target?
  * No

### 14. Future Considerations
- When you add teams, how will billing work? Per team or per user?
  * Will be per organization (organization -> team -> user)
- For MCP servers, do you envision a marketplace or sharing mechanism?
  * Maybe later
- Any specific integrations planned (Slack, Discord, etc.)?
  * yes but later
- Mobile app in the future or responsive web only?
  * responsive only

## Implementation Roadmap

### Week 1-2: Foundation
1. Set up Next.js 15 with TypeScript
2. Configure Convex with Google OAuth
3. Create base terminal UI components
4. Implement basic routing structure

### Week 3-4: Core Chat
1. Build LLM provider abstraction layer
2. Implement streaming chat interface
3. Add markdown rendering and syntax highlighting
4. Create conversation management system

### Week 5-6: Polish & Features
1. Implement conversation branching
2. Add file system-like organization
3. Build model selector UI
4. Add auto-naming for conversations
5. Implement pagination

### Week 7-8: Testing & Deployment
1. End-to-end testing
2. Performance optimization
3. Deploy to Vercel
4. Set up monitoring

## Next Steps
1. Initialize Next.js project with TypeScript
2. Set up Convex backend
3. Create terminal-inspired design system
4. Build authentication flow with Google OAuth

---

# User Theme System - Future Feature

## Overview
Allow users to create, import, export, and apply custom themes to personalize the Oscar interface while maintaining accessibility and design consistency.

## Theme System Architecture

### Theme Interface Structure
```typescript
interface Theme {
  name: string;
  version: string;
  author?: string;
  description?: string;
  colors: {
    // Surface colors (backgrounds)
    surfacePrimary: string;      // Main background
    surfaceSecondary: string;    // Cards, sidebars, dialogs
    surfaceMuted: string;        // Subtle highlights, hover states
    
    // Text colors
    textPrimary: string;         // Main text
    textSecondary: string;       // Muted text
    textAccent: string;          // Links, highlights
    
    // Border colors
    borderPrimary: string;       // Main structural borders
    borderSubtle: string;        // Overlay borders, dividers
    
    // Interactive colors
    interactivePrimary: string;  // Buttons, selections
    interactiveHover: string;    // Hover states
    
    // Status colors
    statusError: string;         // Error states
    statusErrorHover: string;    // Error hover states
    statusWarning: string;       // Warning states
    statusSuccess: string;       // Success states
  };
}
```

### Implementation Components

#### 1. Theme Provider Component
- React context for theme management
- Dynamic CSS variable updates
- Theme validation and fallbacks
- Real-time theme switching

#### 2. Theme Editor UI
```typescript
// Settings panel features:
- Color picker for each semantic color
- Real-time preview of changes
- Import/export theme files (JSON)
- Reset to default theme
- Theme name and metadata editing
- Color accessibility validation
```

#### 3. Built-in Themes
```typescript
const builtInThemes = {
  'oscar-dark': currentTheme,     // Current default
  'oscar-light': lightVariant,
  'high-contrast': accessibleTheme,
  'vscode-dark': vscodeDarkTheme,
  'cursor-inspired': cursorTheme
};
```

### Technical Implementation

#### Dynamic CSS Variable Updates
```typescript
const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  });
};
```

#### Storage Strategy
- **localStorage**: Custom themes and user preferences
- **Database**: Synced themes for logged-in users
- **URL parameters**: Theme sharing via links
- **File system**: Import/export JSON files

#### Theme Validation
```typescript
const validateTheme = (theme: Theme): boolean => {
  // Check required color properties
  // Validate color format (hex, rgb, hsl)
  // Ensure accessibility contrast ratios
  // Verify no circular references
};
```

## User Experience Features

### Theme Management UI
- **Settings Panel**: Access through user menu
- **Theme Gallery**: Browse built-in and custom themes
- **Quick Switch**: Dropdown in header for rapid theme changes
- **Theme Preview**: Real-time preview without applying

### Import/Export Functionality
- **JSON Format**: Standard theme file format
- **Drag & Drop**: Drop theme files to import
- **Share Links**: Generate shareable theme URLs
- **Theme Marketplace**: Future community sharing (Phase 3)

### Accessibility Features
- **Contrast Validation**: Ensure WCAG compliance
- **Color Blind Support**: Built-in accessible themes
- **System Preference**: Respect OS dark/light mode
- **Reduced Motion**: Honor system accessibility settings

## Integration with Current System

### Current Color System Compatibility
- Existing semantic variables remain unchanged
- New themes override root CSS variables
- Fallback to default theme on errors
- Gradual migration path for new color additions

### Component Updates Required
- Add theme context provider to app root
- Update settings UI to include theme editor
- Add theme import/export functionality
- Implement theme validation utilities

## Implementation Timeline

### Phase 1: Foundation (1-2 weeks)
- Theme interface and validation
- Basic theme provider component
- Default theme conversion
- Local storage integration

### Phase 2: User Interface (1-2 weeks)  
- Theme editor component
- Settings panel integration
- Import/export functionality
- Built-in theme variants

### Phase 3: Advanced Features (1 week)
- Real-time preview
- Theme sharing via URLs
- Database sync for logged users
- Accessibility validation

### Phase 4: Polish (1 week)
- Performance optimization
- Error handling and recovery
- Documentation and help text
- User testing and refinement

## Technical Considerations

### Performance
- Lazy load theme editor components
- Cache compiled CSS variables
- Debounce real-time updates
- Minimize DOM reflows

### Compatibility
- Maintain backward compatibility
- Graceful degradation for old themes
- Version management for theme format
- Migration utilities for format changes

### Security
- Sanitize imported theme data
- Validate color values
- Prevent CSS injection
- Rate limit theme operations

---

# Chat Folders Feature - Implementation Plan

## Overview
Add folder support to organize chats in a hierarchical structure, similar to a file system.

## Implementation Stages

### Stage 1: Basic Folder Structure (Current Focus)
**Timeline**: 2-3 days

#### Tasks
- [x] Update database schema
  - [x] Create folders table
  - [x] Add folderId to conversations
  - [x] Create necessary indexes
- [x] Implement backend API
  - [x] folders.create mutation
  - [x] folders.list query
  - [x] folders.update mutation
  - [x] folders.remove mutation
  - [x] conversations.moveToFolder mutation
- [x] Basic frontend implementation
  - [x] Create FolderItem component
  - [x] Update sidebar to show folders
  - [x] Add create folder button
  - [x] Implement folder click navigation

#### Success Criteria
- Users can create folders
- Users can view conversations in folders
- Users can move conversations to folders

### Stage 2: Enhanced UI/UX
**Timeline**: 2-3 days

#### Tasks
- [ ] Visual improvements
  - [ ] Add folder icons (lucide-react)
  - [ ] Implement expand/collapse animations
  - [ ] Add hover and active states
  - [ ] Create empty folder states
- [ ] Context menus
  - [ ] Right-click on folders
  - [ ] Rename, delete, new subfolder options
  - [ ] Keyboard shortcut support
- [ ] Drag and drop
  - [ ] Implement drag handlers
  - [ ] Visual feedback during drag
  - [ ] Drop zone indicators

### Stage 3: Nested Folders
**Timeline**: 3-4 days

#### Tasks
- [ ] Database updates
  - [ ] Add parentId field
  - [ ] Implement path queries
  - [ ] Handle cascade operations
- [ ] Recursive components
  - [ ] Create FolderTree component
  - [ ] Manage expansion state
  - [ ] Implement indentation
- [ ] Navigation
  - [ ] URL routing for folders
  - [ ] Breadcrumb component
  - [ ] Back/forward navigation

### Stage 4: Advanced Features
**Timeline**: 2-3 days

#### Tasks
- [ ] Smart features
  - [ ] Search within folders
  - [ ] Sort options
  - [ ] Bulk operations
- [ ] Performance optimization
  - [ ] Virtual scrolling
  - [ ] Lazy loading
  - [ ] State caching
- [ ] User preferences
  - [ ] Save expansion state
  - [ ] Default folder setting
  - [ ] View options

## Technical Specifications

### Database Schema Updates
```typescript
// New folders table
{
  _id: Id<"folders">
  userId: Id<"users">
  name: string
  parentId?: Id<"folders">  // For nested folders (Stage 3)
  order: number
  createdAt: number
  updatedAt: number
}

// Update conversations table
{
  // existing fields...
  folderId?: Id<"folders">
}
```

### New API Endpoints
- `folders.create({ name, parentId? })`
- `folders.list()`
- `folders.update({ folderId, name })`
- `folders.remove({ folderId, deleteContents? })`
- `folders.move({ folderId, newParentId })`
- `conversations.moveToFolder({ conversationId, folderId })`

### Component Structure
```
components/
  chat/
    folders/
      FolderItem.tsx
      FolderTree.tsx
      FolderContextMenu.tsx
      CreateFolderDialog.tsx
    ConversationList.tsx (updated)
  layout/
    Sidebar.tsx (updated)
    VsCodeSidebar.tsx (updated)
```