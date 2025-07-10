# Localhost Subdomain Setup for Development

## Problem
Browsers don't support setting cookies with domain `.localhost` for security reasons, which prevents NextAuth sessions from working across subdomains like `jverre.localhost:3000`.

## Solution
Use a custom local domain like `app.local` instead of `localhost`.

## Setup Instructions

### 1. Update /etc/hosts file
Add these lines to your `/etc/hosts` file:

```
127.0.0.1 app.local
127.0.0.1 jverre.app.local
127.0.0.1 any-subdomain.app.local
```

Or add a wildcard entry if your system supports it:
```
127.0.0.1 *.app.local
```

### 2. Update environment variables
Update `.env.local`:
```
NEXTAUTH_URL=http://app.local:3000
```

### 3. Update Google OAuth settings
In Google Cloud Console, update the OAuth callback URL to:
```
http://app.local:3000/api/auth/callback/google
```

### 4. Access the application
- Main domain: `http://app.local:3000`
- User subdomains: `http://jverre.app.local:3000`

## How it works
- Cookies will be set with domain `.app.local`
- Sessions will work across all subdomains
- NextAuth will properly share authentication state

## Alternative: Use a real domain
For even better development experience, you could:
1. Buy a cheap domain like `myapp.dev`
2. Point it to 127.0.0.1 in your hosts file
3. Use that for local development