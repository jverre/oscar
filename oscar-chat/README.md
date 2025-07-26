# Oscar Chat

A multi-tenant SaaS application for storing and managing chat conversations from Claude Code, Cursor, and other AI coding assistants. Features a terminal-like aesthetic with VSCode vibes.

## Features

- **Multi-tenant Architecture**: Each organization gets its own subdomain and isolated data
- **Google OAuth Authentication**: Secure sign-in with Google accounts
- **Terminal Aesthetic**: Dark theme with monospace fonts and minimal UI
- **File-based System**: All content stored as files with custom extensions
- **Real-time Updates**: Built on Convex for live collaboration
- **Custom File Types**: Support for `.blog`, `.claude_sessions`, and more

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **UI**: shadcn/ui with custom terminal theme
- **Database**: Convex DB with real-time subscriptions
- **Authentication**: Auth.js with Google OAuth
- **Styling**: Tailwind CSS with Geist Mono font
- **Deployment**: Vercel-ready

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repo-url>
   cd oscar-chat
   npm install
   ```

2. **Setup Local Development**
   ```bash
   # Setup hosts file (requires sudo)
   sudo ./setup-hosts.sh
   
   # Initialize Convex
   npx convex dev
   ```

3. **Configure Environment**
   - Copy `.env.local` template
   - Add Google OAuth credentials
   - Update Convex URLs from step 2

4. **Start Development**
   ```bash
   # Terminal 1: Convex
   npx convex dev
   
   # Terminal 2: Next.js
   npm run dev
   ```

5. **Test the App**
   - Visit `http://oscar-chat.local:3000`
   - Sign in with Google
   - Create your organization
   - Access your org at `http://subdomain.oscar-chat.local:3000`

## Detailed Setup

See [SETUP.md](./SETUP.md) for complete setup instructions including:
- Hosts file configuration
- Google OAuth setup
- Convex project creation
- Environment variables
- Troubleshooting guide

## Project Structure

```
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── auth/signin/        # Authentication pages
│   │   └── org/[subdomain]/    # Organization-specific pages
│   ├── components/             # React components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── providers/          # Context providers
│   ├── utils/                  # Utility functions
│   └── middleware.ts           # Subdomain routing logic
├── convex/                     # Backend functions
│   ├── schema.ts              # Database schema
│   ├── auth.ts                # Authentication logic
│   └── users.ts               # User queries
└── claude_plans/              # Implementation plans
```

## How It Works

### Multi-tenancy
- Users sign in and create an organization with a unique subdomain
- Each org gets isolated data and file system
- Subdomains route to organization-specific pages

### Authentication Flow
1. User visits main domain → redirected to auth
2. Google OAuth sign-in
3. First-time users create organization
4. Redirect to organization subdomain
5. Subsequent visits go directly to org

### File System
- Everything is stored as files with paths
- Support for custom file extensions
- Public/private file permissions
- Real-time collaborative editing

## Development

### Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npx convex dev` - Start Convex backend

### Adding New Features
1. Plan in `claude_plans/` directory
2. Update Convex schema if needed
3. Add UI components with terminal styling
4. Test with multiple subdomains

## Production Deployment

The app is designed to deploy to Vercel with:
- Wildcard subdomain support (`*.oscar-chat.com`)
- Convex production deployment
- Environment variables configured
- Google OAuth production settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the terminal aesthetic guidelines
4. Test with multiple organizations
5. Submit a pull request

## License

MIT License - see LICENSE file for details