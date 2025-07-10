import type { Metadata } from "next";
import { auth } from "@/auth";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { TabProvider } from "@/contexts/TabContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oscar Chat",
  description: "An IDE-inspired chat application",
  keywords: "chat, ide, oscar, real-time",
  authors: [{ name: "Oscar Chat Team" }],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <AuthProvider>
          <ConvexClientProvider session={session}>
            <TabProvider>
              <MainLayout>{children}</MainLayout>
            </TabProvider>
          </ConvexClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

