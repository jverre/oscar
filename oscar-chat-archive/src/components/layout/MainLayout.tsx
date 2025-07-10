"use client";

import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { OscarSidebar } from "./OscarSidebar";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { TabBar } from "./TabBar";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <OscarSidebar />
      <SidebarInset className="flex flex-col h-screen">
        {/* Header - fixed height at top */}
        <div className="flex-shrink-0">
          <TopNav />
        </div>
        
        {/* Tab Bar - fixed height below header (desktop only) */}
        {!isMobile && (
          <div className="flex-shrink-0">
            <TabBar />
          </div>
        )}
        
        {/* Main Content - takes remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
        
        {/* Footer - fixed height at bottom */}
        <div className="flex-shrink-0">
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}