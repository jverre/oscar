# shadcn/ui Theme Configuration

## 1. Install Geist Font
```bash
npm install geist
```

## 2. Update app/layout.tsx
```typescript
import { GeistMono } from 'geist/font/mono'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistMono.className}>
      <body>{children}</body>
    </html>
  )
}
```

## 3. Update tailwind.config.ts
```typescript
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

## 4. Update app/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Convert hex to HSL for shadcn compatibility */
    --background: 0 0% 8%;          /* #141414 */
    --foreground: 0 0% 82%;         /* #D0D0D0 */

    --card: 0 0% 13%;               /* #202020 */
    --card-foreground: 0 0% 82%;    /* #D0D0D0 */

    --popover: 0 0% 13%;            /* #202020 */
    --popover-foreground: 0 0% 82%; /* #D0D0D0 */

    --primary: 0 0% 82%;            /* #D0D0D0 for text/accents */
    --primary-foreground: 0 0% 8%;  /* #141414 */

    --secondary: 0 0% 10%;          /* #1A1A1A */
    --secondary-foreground: 0 0% 82%; /* #D0D0D0 */

    --muted: 0 0% 10%;              /* #1A1A1A */
    --muted-foreground: 0 0% 51%;   /* #838383 */

    --accent: 0 0% 13%;             /* #202020 for interactive */
    --accent-foreground: 0 0% 82%;  /* #D0D0D0 */

    --destructive: 11 60% 48%;      /* #CC4125 */
    --destructive-foreground: 0 0% 98%;

    --success: 95 38% 62%;          /* #98C379 */
    --warning: 42 64% 66%;          /* #E5C07B */

    --border: 0 0% 60%;             /* #999999 */
    --input: 0 0% 60%;              /* #999999 */
    --ring: 0 0% 82%;               /* #D0D0D0 for focus rings */

    --radius: 0.25rem;              /* Minimal rounding for terminal aesthetic */
  }

  .dark {
    /* Dark mode is the default, same values */
    --background: 0 0% 8%;
    --foreground: 0 0% 82%;

    --card: 0 0% 13%;
    --card-foreground: 0 0% 82%;

    --popover: 0 0% 13%;
    --popover-foreground: 0 0% 82%;

    --primary: 0 0% 82%;
    --primary-foreground: 0 0% 8%;

    --secondary: 0 0% 10%;
    --secondary-foreground: 0 0% 82%;

    --muted: 0 0% 10%;
    --muted-foreground: 0 0% 51%;

    --accent: 0 0% 13%;
    --accent-foreground: 0 0% 82%;

    --destructive: 11 60% 48%;
    --destructive-foreground: 0 0% 98%;

    --success: 95 38% 62%;
    --warning: 42 64% 66%;

    --border: 0 0% 60%;
    --input: 0 0% 60%;
    --ring: 0 0% 82%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Custom utility classes for your specific needs */
@layer utilities {
  .surface-primary {
    @apply bg-background;
  }
  
  .surface-secondary {
    @apply bg-card;
  }
  
  .surface-muted {
    @apply bg-secondary;
  }
  
  .text-primary {
    @apply text-foreground;
  }
  
  .text-secondary {
    @apply text-muted-foreground;
  }
  
  .text-accent {
    @apply text-primary;
  }
  
  .border-primary {
    @apply border-border;
  }
  
  .interactive-primary {
    @apply bg-accent hover:bg-accent/80;
  }
}

/* Terminal-style customizations */
@layer components {
  /* Buttons with terminal aesthetic */
  .btn-terminal {
    @apply bg-accent text-accent-foreground hover:bg-[hsl(0_0%_16%)] 
           border border-border rounded-sm transition-colors
           font-mono text-sm;
  }
  
  /* Input fields */
  .input-terminal {
    @apply bg-background border-border text-foreground 
           placeholder:text-muted-foreground
           focus:ring-1 focus:ring-ring rounded-sm;
  }
  
  /* Cards and panels */
  .card-terminal {
    @apply bg-card text-card-foreground border border-border 
           rounded-sm shadow-sm;
  }
}
```

## 5. Update components.json
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## 6. Example Component Usage
```tsx
// Terminal-style button
<Button className="font-mono text-xs bg-secondary hover:bg-muted">
  Execute
</Button>

// Terminal-style card
<Card className="bg-card border-border rounded-sm">
  <CardContent className="font-mono text-sm text-foreground">
    {content}
  </CardContent>
</Card>

// Status indicators
<Badge variant="destructive">Error</Badge>
<Badge className="bg-success text-background">Success</Badge>
<Badge className="bg-warning text-background">Warning</Badge>
```

## 7. VS Code Theme Matching Tips

To ensure your components match the terminal aesthetic:
1. Use `rounded-sm` or `rounded-none` instead of default rounded corners
2. Always use `font-mono` for code-like content
3. Prefer `text-sm` or `text-xs` for compact terminal feel
4. Use borders sparingly, when used make them subtle with `border-border`
5. For hover states, use subtle background changes like `hover:bg-muted`

## Color Mapping Reference
- `#141414` → `--background` (main background)
- `#202020` → `--card`, `--popover` (elevated surfaces)
- `#1A1A1A` → `--secondary`, `--muted` (subtle backgrounds)
- `#D0D0D0` → `--foreground`, `--primary` (main text/accents)
- `#838383` → `--muted-foreground` (secondary text)
- `#999999` → `--border`, `--input` (borders)
- `#CC4125` → `--destructive` (errors)
- `#98C379` → `--success` (success states)
- `#E5C07B` → `--warning` (warnings)