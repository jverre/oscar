"use client";

import React from 'react';
import { Tab } from './Tab';
import { useFileContext } from '@/components/providers/FileProvider';

export const TabBar = () => {
  const { tabs, activeFile, closeTab } = useFileContext();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex h-8 bg-sidebar border-b border-sidebar-border overflow-x-auto">
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          filePath={tab.id}
          fileName={tab.title}
          isActive={activeFile === tab.id}
          onClose={closeTab}
        />
      ))}
    </div>
  );
}; 