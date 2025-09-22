import { HeadContent, Scripts, createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

import ConvexProvider from '../integrations/convex/provider'
import type { AuthContextType } from '../auth'
import { AuthProvider } from '../auth'

import appCss from '../styles.css?url'

const NotFoundPage = lazy(() => import('./_404').then(m => ({ default: m.Route.options.component! })))

interface RouterContext {
  auth: AuthContextType
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Oscar Chat - AI Conversation Viewer',
      },
      {
        name: 'description',
        content: 'View and browse AI chat conversations with support for tool calls and real-time updates',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
    ],
  }),

  component: RootComponent,
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <Suspense fallback={<div>Loading...</div>}>
      <NotFoundPage />
    </Suspense>
  ),
})

function RootComponent() {
  return <Outlet />
}

const queryClient = new QueryClient()

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider>
          <AuthProvider>
          <QueryClientProvider client={queryClient}>
            {children}
            {import.meta.env.DEV && <DevtoolsContainer />}
            </QueryClientProvider>
          </AuthProvider>
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  )
}

function DevtoolsContainer() {
  const TanstackDevtools = lazy(() => import('@tanstack/react-devtools').then(m => ({ default: m.TanstackDevtools })))
  const TanStackRouterDevtoolsPanel = lazy(() => import('@tanstack/react-router-devtools').then(m => ({ default: m.TanStackRouterDevtoolsPanel })))

  return (
    <Suspense fallback={null}>
      <TanstackDevtools
        config={{
          position: 'bottom-left',
        }}
        plugins={[
          {
            name: 'Tanstack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </Suspense>
  )
}

