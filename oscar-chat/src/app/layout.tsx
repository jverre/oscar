import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import ConvexClientProvider from "./ConvexProviderWithAuth";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { auth } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oscar Chat - AI Conversation Manager",
  description: "Multi-tenant SaaS for storing and managing AI coding assistant conversations",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  
  return (
    <html lang="en" className={GeistMono.className} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ConvexClientProvider session={session}>
            {children}
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
