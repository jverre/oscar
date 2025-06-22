"use client";

import { useTabContext } from "@/contexts/TabContext";
import { TabItem } from "./TabItem";
import { useRef, useEffect } from "react";

export function TabBar() {
  const { openTabs, activeTabId } = useTabContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // Scroll to active tab when it changes
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeTab = activeTabRef.current;
      
      // Check if the active tab is fully visible
      const containerRect = container.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();
      
      // If tab is not fully visible, scroll to it
      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        activeTab.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  }, [activeTabId]);

  // Don't render if no tabs are open
  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className="h-[32px] bg-sidebar flex-shrink-0 min-w-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div 
        ref={scrollContainerRef}
        className="flex items-center h-full overflow-x-auto overflow-y-hidden scrollbar-hide min-w-0"
      >
        {openTabs.map((tab) => (
          <TabItem
            key={tab.id}
            tabId={tab.id}
            conversationId={tab.conversationId}
            title={tab.title}
            isActive={activeTabId === tab.id}
            tabCount={openTabs.length}
            ref={activeTabId === tab.id ? activeTabRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}