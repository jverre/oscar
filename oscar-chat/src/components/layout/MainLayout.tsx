"use client";

import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { OscarSidebar } from "./OscarSidebar";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { TabBar } from "./TabBar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration to complete before showing mobile-specific content
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <SidebarProvider>
      <OscarSidebar />
      <SidebarInset className="flex flex-col h-screen">
        {/* Header - fixed height at top */}
        <div className="flex-shrink-0">
          <TopNav />
        </div>
        
        {/* Tab Bar - fixed height below header (desktop only) */}
        {isHydrated && !isMobile && (
          <div className="flex-shrink-0">
            <TabBar />
          </div>
        )}
        
        {/* Main Content - takes remaining space */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>
        
        {/* Footer - fixed height at bottom */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}