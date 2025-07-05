import type { Metadata } from "next";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { MainLayout } from "@/components/layout/MainLayout";
import { TabProvider } from "@/contexts/TabContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oscar Chat",
  description: "An IDE-inspired chat application",
  keywords: "chat, ide, oscar, real-time",
  authors: [{ name: "Oscar Chat Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className="dark">
        <head>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </head>
        <body>
          <ConvexClientProvider>
            <TabProvider>
              <MainLayout>{children}</MainLayout>
            </TabProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}

