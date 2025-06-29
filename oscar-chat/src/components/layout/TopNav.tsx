"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { CommandPalette } from "@/components/ui/command-palette";
import { useFileCreation } from "@/hooks/useFileCreation";
import { useGitCreation } from "@/hooks/useGitCreation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export function TopNav() {
  const isMobile = useIsMobile();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputMode, setInputMode] = useState<{ placeholder: string; onSubmit: (value: string) => void; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { createFile } = useFileCreation();
  const { createGitFolder, error: gitError } = useGitCreation();

  // Mock commands for filtering
  const mockCommands = [
    { id: "create-chat", title: "Create Chat", keywords: ["create", "new", "chat", "conversation", "start"] },
    { id: "create-blog", title: "Create Blog", keywords: ["create", "new", "blog", "post", "write"] },
    { id: "clone-repository", title: "Clone Repository", keywords: ["clone", "git", "repository", "github", "repo"] },
    { id: "search-chat", title: "Search Chat", keywords: ["search", "find", "chat", "conversation", "browse"] }
  ];

  // Filter commands based on search
  const filteredCommands = mockCommands.filter(command => {
    const searchLower = searchValue.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchLower) ||
      command.keywords.some(keyword => keyword.includes(searchLower))
    );
  });

  // Handle Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCommandPaletteOpen(false);
        setIsInputFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    setSelectedIndex(0); // Reset selection when search changes
    setIsCommandPaletteOpen(value.length > 0 || isInputFocused);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setIsCommandPaletteOpen(true);
  };

  const handleInputBlur = () => {
    // Delay to allow command selection
    setTimeout(() => {
      setIsInputFocused(false);
    }, 150);
  };

  const handleClose = () => {
    setIsCommandPaletteOpen(false);
    setSearchValue("");
    setInputMode(null);
    inputRef.current?.blur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCommandPaletteOpen) return;

    // Handle input mode separately
    if (inputMode) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          inputMode.onSubmit(searchValue);
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
      return;
    }

    // Normal command navigation
    if (filteredCommands.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  };

  const executeCommand = async (commandId: string) => {
    switch (commandId) {
      case 'create-chat':
        await createFile({ navigate: true, fileType: 'chat' });
        handleClose();
        break;
      case 'create-blog':
        await createFile({ navigate: true, fileType: 'blog' });
        handleClose();
        break;
      case 'clone-repository':
        // Switch to input mode instead of closing
        setSearchValue("");
        setInputMode({
          placeholder: "Enter GitHub repository (e.g., user/repo or https://github.com/user/repo)",
          onSubmit: async (repoUrl: string) => {
            if (repoUrl.trim()) {
              const result = await createGitFolder(repoUrl.trim());
              if (result) {
                // Success - close the input
                handleClose();
              } else {
                // Error - update input mode to show error and keep it open
                setInputMode(prev => prev ? { ...prev, error: gitError } : null);
              }
            }
          }
        });
        break;
      case 'search-chat':
        console.log("Search chat functionality coming soon");
        handleClose();
        break;
      default:
        console.log("Unknown command:", commandId);
        handleClose();
    }
  };


  return (
    <div className="h-[35px] flex items-center px-4" style={{ backgroundColor: 'var(--surface-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Mobile hamburger menu - far left */}
      {isMobile && (
        <div className="mr-4">
          <SidebarTrigger />
        </div>
      )}
      
      {/* Search bar - centered or left-aligned based on mobile */}
      <div className={`relative w-96 max-w-full ${isMobile ? 'flex-1' : 'mx-auto'}`} ref={containerRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder={inputMode ? inputMode.placeholder : "Search"}
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-full pl-8 pr-12 h-[24px] bg-sidebar-accent rounded text-xs focus:outline-none text-foreground transition-colors"
            style={{ 
              border: '1px solid var(--border-subtle)',
              WebkitAppearance: 'none'
            }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
            ⌘K
          </div>
        </div>
        
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={handleClose}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={setSelectedIndex}
          onExecuteCommand={executeCommand}
          inputMode={inputMode}
        />
      </div>
    </div>
  );
}