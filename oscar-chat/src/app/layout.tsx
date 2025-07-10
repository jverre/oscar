import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oscar Chat - AI Conversation Manager",
  description: "Multi-tenant SaaS for storing and managing AI coding assistant conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistMono.className}>
      <body className="bg-background text-foreground antialiased">
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
