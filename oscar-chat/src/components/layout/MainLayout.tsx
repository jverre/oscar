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
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Header - fixed at top */}
        <div className="sticky top-0 z-50">
          <TopNav />
        </div>
        
        {/* Tab Bar - hidden on mobile, sticky below header */}
        {!isMobile && (
          <div className="sticky top-[35px] z-40">
            <TabBar />
          </div>
        )}
        
        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
        
        {/* Footer - sticky at bottom */}
        <div className="sticky bottom-0 z-40">
          <Footer />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}