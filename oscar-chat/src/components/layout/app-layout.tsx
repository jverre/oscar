"use client";

import { useState } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { Sidebar } from "./sidebar";
import { FileProvider } from "@/components/providers/FileProvider";
import { TabBar } from "@/components/editor/tabs/TabBar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <FileProvider>
      <div className="h-screen flex flex-col">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-hidden">
          {/* Desktop layout with resizable panels */}
          <div className="hidden md:block h-full">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={15} minSize={10} maxSize={50} className="min-w-[180px] max-w-[600px]">
                <Sidebar />
              </ResizablePanel>
              
              <ResizableHandle />
              
              <ResizablePanel defaultSize={85}>
                <div className="h-full flex flex-col">
                  <TabBar />
                  <main className="bg-card flex-1 overflow-y-auto">
                    {children}
                  </main>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>

          {/* Mobile layout */}
          <div className="md:hidden h-full">
            <div className="h-full flex flex-col">
              <TabBar />
              <main className="bg-card flex-1 overflow-y-auto">
                {children}
              </main>
            </div>
          </div>
        </div>
        
        <Footer />

        {/* Mobile sidebar drawer */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="h-full overflow-y-auto">
              <Sidebar onItemClick={() => setMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </FileProvider>
  );
}