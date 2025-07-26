# Vercel Preview Deployments with Authentication

This document explains how authentication works with Vercel preview deployments in this multi-tenant application.

## How It Works

### Automatic URL Detection

The application automatically detects and uses the correct URL for authentication without requiring `NEXTAUTH_URL` to be set:

1. **Priority Order** (in `src/auth.ts`):
   - `NEXTAUTH_URL` (if explicitly set)
   - `VERCEL_URL` (automatically provided by Vercel)
   - `NEXT_PUBLIC_APP_URL` (fallback)

2. **Cookie Domain Handling**:
   - Production: `.getoscar.ai`
   - Vercel Preview: `.vercel.app`
   - Local Development: `.localtest.me`

3. **Multi-tenant Support**:
   - Preview URLs work with tenant subdomains
   - Example: `tenant.my-branch-xyz.vercel.app`

## Setup Instructions

### 1. Vercel Project Settings

Enable automatic system environment variables:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Enable "Automatically expose System Environment Variables"

This provides:
- `VERCEL_URL`: The deployment's unique URL
- `VERCEL_ENV`: The environment type (preview/production)

### 2. OAuth Configuration

#### Option A: Wildcard Domain (Recommended)
Add these OAuth redirect URIs to your Google OAuth app:
```
https://*.vercel.app/api/auth/callback/google
```

#### Option B: Branch-specific URLs
For specific branches:
```
https://your-branch-*.vercel.app/api/auth/callback/google
```

#### Option C: Per-deployment URLs
For maximum security, add specific deployment URLs:
```
https://oscar-chat-git-feature-branch-yourteam.vercel.app/api/auth/callback/google
```

### 3. Environment Variables

**DO NOT SET** in Vercel for preview deployments:
- `NEXTAUTH_URL` - Automatically detected
- `NEXT_PUBLIC_APP_URL` - Not needed

**MUST SET** in Vercel:
- `NEXT_PUBLIC_CONVEX_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `CONVEX_AUTH_ADAPTER_SECRET`
- `CONVEX_AUTH_PRIVATE_KEY`
- `JWKS`

## How Preview Deployments Work

1. **URL Detection**:
   ```typescript
   // Automatically uses VERCEL_URL when available
   const authUrl = process.env.VERCEL_URL 
     ? `https://${process.env.VERCEL_URL}`
     : process.env.NEXTAUTH_URL
   ```

2. **Cookie Sharing**:
   - Cookies are set on `.vercel.app` domain
   - Allows authentication to work across subdomains
   - Example: Auth on `preview.vercel.app` works on `tenant.preview.vercel.app`

3. **Tenant Routing**:
   - Middleware detects Vercel preview URLs
   - Properly extracts tenant subdomain
   - Routes authentication through base domain

## Troubleshooting

### Authentication Not Working
1. Verify `VERCEL_URL` is available: Add a console.log in your app
2. Check OAuth redirect URIs include your preview domain
3. Ensure all required env vars are set in Vercel

### Cookies Not Persisting
1. Check browser console for cookie warnings
2. Verify cookies are set on `.vercel.app` domain
3. Ensure you're using HTTPS (Vercel provides this automatically)

### Tenant Subdomains Not Working
1. Check middleware is detecting Vercel preview environment
2. Verify subdomain extraction logic for your URL pattern
3. Test with console.logs in middleware

## Local Development

For local development, continue using:
```env
NEXTAUTH_URL=http://localtest.me:3000
```

This ensures cookies work across subdomains locally.

## Production Deployment

For production, set:
```env
NEXTAUTH_URL=https://getoscar.ai
```

This ensures consistent behavior and proper cookie domain setting.