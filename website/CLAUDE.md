Oscar is a code building app with an option to share chats.

# Code style

1. Always search @components for components to re-use
2. All colors should come from styles.css
3. When importing components, use "@" notation instead of ".." as much as possible
4. Use shadcn components whenever possible, update the styling to match the look and feel
   of existing components

# Development

1. Never run "npm run dev" - I always have this running and so can tell you if there is an issue.
2. There are no "npm run typecheck" command. Don't use it

# Features

The chat viewer (chat.$conversationId.tsx) is a public page available to all users.