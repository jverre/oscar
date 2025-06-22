# Claude's guide to Oscar development

## What is Oscar

Oscar is a LLM chat app that resembles VS-Code and Cursor. In addition to being able to call multiple different LLM providers, users can:
1. Organize chats in folders
2. Upload attachments and store them in folders

The style of the app is inspired by both VS-Code and Cursor with some terminal line UI elements as well.

## Your role

Your role is to write code. You do NOT have access to the running app, so you cannot tests the code. You must rely on me, the user, to test the code.

If I report a bug in your code, after you fix it, you should pause and ask me to verify that the bug is fixed.

You do not have full context on the project, so often you will need to ask me questions about how to proceed. Don't be shy to ask questions, I'm here to help you !

If I send you a URL, you MUSt immediately fetch its content and reat it carefully before you do anything else.


## Coding style

We are building a production ready app, make sure to follow industry best practices especially for common tasks. In order to create a great UX experience, use deterministic updates where possible using Convex (read more here: https://docs.convex.dev/client/react/optimistic-updates).

-   **TypeScript:** Strict typing enabled, ES2020 target. Use `as` only in exceptional
    circumstances, and then only with an explanatory comment. Prefer type hints.
-   **Components:** PascalCase for React components
-   **Hooks:** camelCase with "use" prefix
-   **Formatting:** 4-space indentation, Prettier formatting
-   **Promise handling:** All promises must be handled (ESLint enforced)
-   **Nulls:** Prefer undefined to null. Convert `null` values from the database into undefined.

IMPORTANT: If you want to use any of these features, you must alert me and explicitly ask for my permission first: `setTimeout`, `useImperativeHandle`, `useRef`, or type assertions with `as`.

## Design System & Colors

Oscar uses a simplified, semantic color system designed for easy theming. **Always use design system colors - never hardcode colors.**

### Core Color Variables

**Surface Colors (Backgrounds):**
- `--surface-primary: #141414` - Main app background
- `--surface-secondary: #202020` - Cards, sidebars, elevated elements
- `--surface-elevated: #202020` - Dialogs, dropdowns, overlays

**Text Colors:**
- `--text-primary: #D0D0D0` - Main text
- `--text-secondary: #838383` - Muted/secondary text
- `--text-accent: #D0D0D0` - Links, highlights

**Border Colors:**
- `--border-primary: #999999` - Main structural borders
- `--border-subtle: rgba(255, 255, 255, 0.1)` - Overlay borders, dividers

**Interactive Colors:**
- `--interactive-primary: #202020` - Buttons, selections
- `--interactive-hover: #2A2A2A` - Hover states

**Status Colors:**
- `--status-error: #F48771` - Error states
- `--status-error-hover: #E5745D` - Error hover states
- `--status-warning: #E5C07B` - Warning states
- `--status-success: #98C379` - Success states

### Usage Guidelines

**CSS Variables (Preferred):**
```css
style={{ backgroundColor: 'var(--surface-secondary)' }}
style={{ color: 'var(--text-primary)' }}
style={{ border: '1px solid var(--border-subtle)' }}
```

**Tailwind Classes (When Available):**
```jsx
className="bg-background text-foreground border-border"
className="text-muted-foreground hover:text-foreground"
className="bg-sidebar text-sidebar-foreground"
```

**What NOT to Do:**
- ❌ Hardcoded colors: `#141414`, `rgb(255,255,255)`, `text-white`
- ❌ Arbitrary values: `bg-gray-800`, `border-white/20`
- ❌ Complex chained variables: `text-sidebar-accent-foreground` (use `text-foreground` instead)

### Theming

The design system is built for easy theming. To create new themes, simply override the CSS variables:

```css
.theme-light {
  --surface-primary: #ffffff;
  --surface-secondary: #f5f5f5;
  --text-primary: #000000;
  --text-secondary: #666666;
  /* ... etc */
}
```

### Global Styles

- All buttons automatically have `cursor: pointer`
- Focus outlines are disabled on buttons (they have their own hover/focus styles)
- Text inputs and textareas keep focus outlines for accessibility

