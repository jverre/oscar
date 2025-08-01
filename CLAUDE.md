# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oscar is a multi-component SaaS platform for managing AI chat conversations with a terminal-aesthetic UI. It consists of:
- **oscar-chat**: Main Next.js 15 web application
- **extensions/vs-code**: VS Code extension for syncing Claude Code conversations
- **oscar-sandbox**: Python Modal service for secure terminal environments

## Development Commands

### Oscar Chat (Main Application)
```bash
# Development
npm run dev          # Start development server (http://localtest.me:3000)
npx convex dev       # Start Convex backend (required for development)

# Code quality
npm run lint         # Run ESLint
npm run typecheck    # TypeScript type checking

# Production
npm run build        # Build for production
npm run start        # Start production server
```

### VS Code Extension
```bash
npm run compile      # Compile TypeScript
npm run watch        # Watch mode for development
```

### Oscar Sandbox
```bash
modal deploy         # Deploy to Modal platform
```

## Architecture

### Multi-tenant File-based System
- Each organization has isolated data accessed via subdomain:
  - Development: `http://localtest.me:3000/` or `http://<tenant>.localtest.me:3000/`
  - Production: `https://<tenant>.getoscar.ai`
- Everything is stored as files with custom extensions:
  - `.blog` - Blog posts in YAML format
  - `.claude_sessions` - Claude chat sessions
  - Custom plugin-defined file types

### Key Directories
- `oscar-chat/src/app/` - Next.js App Router pages and API routes
- `oscar-chat/src/components/` - UI components organized by feature (chat/, editor/, plugins/)
- `oscar-chat/convex/` - Backend functions and database schema
- `oscar-chat/src/middleware.ts` - Subdomain routing logic

### Database Schema (Convex)
- **organizations**: Root tenant object with subdomain
- **users**: Associated with organizations
- **files**: Virtual file system with parent/child relationships
- **sessions**: Chat sessions stored as files
- **sandboxes**: Terminal environments for code execution

### Plugin System
Plugins extend file types and editor capabilities:
- Register custom file extensions
- Provide custom viewers/editors
- Access sandbox environments
- See `oscar-chat/src/components/plugins/` for examples

### Authentication Flow
1. Users authenticate via Google OAuth (NextAuth.js)
2. Each user belongs to exactly one organization (stored in user.organizationId)
3. New users create an organization during onboarding
4. Session includes convexToken for authenticated Convex queries
5. TenantAccessGuard ensures users can only access their organization's subdomain

## Development Setup Requirements

1. Node.js 20+ and npm
2. Convex account (for backend)
3. Google OAuth credentials
4. Environment variables in `.env.local`
5. No hosts file modification needed - localtest.me automatically resolves to 127.0.0.1

## Common Development Patterns

### Adding New File Types
1. Define schema in `convex/schema.ts`
2. Create viewer/editor components in `src/components/plugins/`
3. Register in plugin system
4. Add file operations in `convex/files.ts`

### Working with Convex
- All database queries go through Convex functions
- Use `useQuery` and `useMutation` hooks
- Real-time subscriptions are automatic
- Schema changes require `npx convex dev --run init`

### Subdomain Routing
- Middleware extracts organization from subdomain
- All pages must handle organization context
- Organization data flows through Convex queries

### Terminal UI Theme
- All colors, fonts, and theme variables defined in `oscar-chat/src/app/globals.css`
- Components follow terminal aesthetic (see CommandInput, TerminalMessage)
- Tailwind CSS v4 with custom theme configuration