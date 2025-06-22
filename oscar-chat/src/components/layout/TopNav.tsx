"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { CommandPalette } from "@/components/ui/command-palette";
import { useChatCreation } from "@/hooks/useChatCreation";

export function TopNav() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { createChat } = useChatCreation();

  // Mock commands for filtering
  const mockCommands = [
    { id: "create-chat", title: "Create Chat", keywords: ["create", "new", "chat", "conversation", "start"] },
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
    inputRef.current?.blur();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCommandPaletteOpen || filteredCommands.length === 0) return;

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
        await createChat({ navigate: true });
        break;
      case 'search-chat':
        console.log("Search chat functionality coming soon");
        break;
      default:
        console.log("Unknown command:", commandId);
    }
    handleClose();
  };


  return (
    <div className="h-[35px] bg-sidebar flex items-center justify-center px-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <div ref={containerRef} className="relative w-96 max-w-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3" style={{ color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search"
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
        />
      </div>
    </div>
  );
}