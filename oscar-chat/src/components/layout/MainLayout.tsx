"use client";

import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";
import { TabBar } from "./TabBar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header - spans full width */}
      <TopNav />
      
      {/* Content area - contains sidebar and main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - fixed width, full height of remaining space */}
        <Sidebar />
        
        {/* Main Content Area - takes remaining width, includes tabs and content */}
        <div className="flex flex-1 flex-col min-h-0 min-w-0">
          {/* Tab Bar */}
          <TabBar />
          
          {/* Main Content */}
          <main className="flex-1 min-h-0">
            {children}
          </main>
        </div>
      </div>
      
      {/* Footer - spans full width */}
      <Footer />
    </div>
  );
}