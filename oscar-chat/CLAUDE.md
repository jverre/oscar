# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-tenant SaaS application for storing and managing chat conversations from Claude Code, Cursor, and other AI coding assistants. The app features a terminal-like aesthetic with VSCode vibes.

## Technology Stack

- **Frontend**: Next.js with TypeScript
- **UI Components**: shadcn/ui with custom theming
- **Database**: Convex DB
- **Authentication**: Auth.js
- **Deployment**: Vercel

## Architecture

### Multi-tenancy
- Users choose their organization name on signup which becomes their subdomain
- Each organization has its own isolated data and file system

### File System
- All content is file-based with support for both public and private files
- Files are stored and accessed through Convex DB
- File paths follow a hierarchical structure within each organization

### Custom File Extensions
- `.blog` - Blog posts rendered with Tiptap editor
- `.claude_sessions` - Claude Code session logs displayed in a terminal component running in Modal sandbox
- Additional extensions can be added for different conversation types

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## Key Directories

- `/src/app` - Next.js app router pages and layouts
- `/src/components` - React components organized by feature
- `/convex` - Convex database schema and functions
- `/src/hooks` - Custom React hooks for file operations and navigation
- `/src/utils` - Utility functions for file handling and content processing

## Important Patterns

### File Operations
- Use the custom hooks in `/src/hooks` for file operations (creation, navigation, selection)
- File URLs follow the pattern: `/org/[subdomain]/[...filePath]`
- File operations are handled through Convex mutations

### Authentication Flow
- Auth.js handles authentication with organization-based access control
- Middleware enforces subdomain-based routing and authentication
- Protected routes check for valid organization membership

### UI Components
- Follow the established terminal/VSCode aesthetic
- Use shadcn/ui components with custom theme variables
- Maintain consistent file tree and editor-like interfaces

## Testing Approach

When testing features:
1. Test file operations (create, read, update, delete)
2. Verify multi-tenant isolation
3. Check authentication and authorization flows
4. Test custom file type rendering
5. Ensure responsive design works across devices