"use client";

import { useTabContext } from "@/contexts/TabContext";
import { TabItem } from "./TabItem";
import { useRef, useEffect, useState } from "react";

export function TabBar() {
  const { openTabs, activeTabId } = useTabContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

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

  const handleDragEnter = () => {
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag state if we're leaving the tab bar entirely
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || 
        e.clientY < rect.top || e.clientY > rect.bottom) {
      setIsDragActive(false);
    }
  };

  const handleDrop = () => {
    setIsDragActive(false);
  };

  return (
    <div 
      className="tab-bar h-[32px] flex-shrink-0 min-w-0"
      style={{ backgroundColor: 'var(--surface-primary)', borderBottom: '1px solid var(--border-subtle)' }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        ref={scrollContainerRef}
        className="flex items-center h-full overflow-x-auto overflow-y-hidden scrollbar-hide min-w-0"
      >
        {openTabs.map((tab, index) => (
          <TabItem
            key={tab.id}
            tabId={tab.id}
            conversationId={undefined}
            title={tab.title}
            isActive={activeTabId === tab.id}
            tabCount={openTabs.length}
            index={index}
            ref={activeTabId === tab.id ? activeTabRef : undefined}
          />
        ))}
      </div>
    </div>
  );
}