"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { CommandPalette } from "@/components/ui/command-palette";
import { SearchResults } from "@/components/ui/search-results";
import { useFileCreation } from "@/hooks/useFileCreation";
import { useGitCreation } from "@/hooks/useGitCreation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTabContext } from "@/contexts/TabContext";
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";

export function TopNav() {
  const isMobile = useIsMobile();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [inputMode, setInputMode] = useState<{ placeholder: string; onSubmit: (value: string) => void; error?: string } | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { createFile } = useFileCreation();
  const { createGitFolder, error: gitError } = useGitCreation();
  const { addTab, isTabOpenByFile, getTabByFile, switchToTab } = useTabContext();
  const createSession = useMutation(api.claudeCodeSession.createSession);
  const router = useRouter();
  
  // Get current user and organization info
  const currentUser = useQuery(api.users.current);
  const userOrg = useQuery(api.organizations.getCurrentUserOrg);
  
  
  // Search query
  const searchQueryResults = useQuery(
    api.search.searchCombined,
    searchMode && searchValue.trim().length > 2 
      ? { searchText: searchValue.trim(), limit: 20 }
      : "skip"
  );

  // Mock commands for filtering
  const mockCommands = [
    { id: "create-chat", title: "Create Chat", keywords: ["create", "new", "chat", "conversation", "start"] },
    { id: "create-blog", title: "Create Blog", keywords: ["create", "new", "blog", "post", "write"] },
    { id: "start-claude-code", title: "Start Claude Code Session", keywords: ["claude", "code", "terminal", "session", "start", "web"] },
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
        setSearchMode(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Process search results
  useEffect(() => {
    if (searchQueryResults) {
      const processedResults: any[] = [];

      // Add file results
      searchQueryResults.files.forEach((file) => {
        processedResults.push({
          type: "file",
          id: file._id,
          title: file.name,
          subtitle: `File • Last updated ${new Date(file.lastMessageAt).toLocaleDateString()}`,
          timestamp: file.lastMessageAt,
          fileId: file._id
        });
      });

      // Add message results
      searchQueryResults.messages.forEach((message) => {
        if (message.file) {
          // Extract preview text from message content
          const preview = message.searchableText
            ? message.searchableText.substring(0, 100) + (message.searchableText.length > 100 ? "..." : "")
            : "Message content";

          processedResults.push({
            type: "message",
            id: message._id,
            title: preview,
            subtitle: `Message from ${new Date(message.createdAt).toLocaleDateString()}`,
            timestamp: message.createdAt,
            fileId: message.fileId,
            fileName: message.file.name
          });
        }
      });

      // Sort by timestamp (most recent first)
      processedResults.sort((a, b) => b.timestamp - a.timestamp);
      
      setSearchResults(processedResults);
      setSelectedIndex(0);
    } else {
      setSearchResults([]);
    }
  }, [searchQueryResults]);

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
    setSearchMode(false);
    setSearchResults([]);
    inputRef.current?.blur();
  };

  const handleSearchResultSelect = (result: any) => {
    const fileIdTyped = result.fileId as Id<"files">;
    
    // Check if tab already exists for this file
    if (isTabOpenByFile(fileIdTyped)) {
      // Switch to existing tab
      const existingTab = getTabByFile(fileIdTyped);
      if (existingTab) {
        switchToTab(existingTab.id);
      }
    } else {
      // Create new tab
      const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      addTab({
        id: newTabId,
        fileId: fileIdTyped,
        title: result.fileName || result.title
      });

      // Navigate to the file
      if (result.fileName) {
        const encodedFileName = encodeURIComponent(result.fileName);
        router.push(`/${encodedFileName}`);
      }
    }
    
    handleClose();
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

    // Handle search mode separately
    if (searchMode) {
      if (searchResults.length === 0) {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleClose();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSearchResultSelect(searchResults[selectedIndex]);
          }
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
        // Switch to input mode instead of closing
        setSearchValue("");
        setInputMode({
          placeholder: "Enter chat name (e.g., My Project Chat)",
          onSubmit: async (chatName: string) => {
            if (chatName.trim()) {
              const result = await createFile({ 
                name: chatName.trim(), 
                navigate: true, 
                fileType: 'chat' 
              });
              if (result) {
                // Success - close the input
                handleClose();
              } else {
                // Error - update input mode to show error and keep it open
                setInputMode(prev => prev ? { ...prev, error: "Failed to create chat. Please try again." } : null);
              }
            }
          }
        });
        break;
      case 'create-blog':
        // Switch to input mode instead of closing
        setSearchValue("");
        setInputMode({
          placeholder: "Enter blog title (e.g., My First Blog Post)",
          onSubmit: async (blogTitle: string) => {
            if (blogTitle.trim()) {
              const result = await createFile({ 
                name: blogTitle.trim(), 
                navigate: true, 
                fileType: 'blog' 
              });
              if (result) {
                // Success - close the input
                handleClose();
              } else {
                // Error - update input mode to show error and keep it open
                setInputMode(prev => prev ? { ...prev, error: "Failed to create blog. Please try again." } : null);
              }
            }
          }
        });
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
                setInputMode(prev => prev ? { ...prev, error: gitError || undefined } : null);
              }
            }
          }
        });
        break;
      case 'start-claude-code':
        try {
          // Create a new Claude Code session
          const sessionResult = await createSession({});
          
          if (sessionResult && currentUser) {
            // Navigate to the new session file
            const sessionPath = `/${sessionResult.sessionName}`;
            router.push(sessionPath);
            
            // Add tab for the session
            addTab({
              id: sessionResult.fileId,
              title: sessionResult.sessionName.replace('.claude_session', ''),
              fileId: sessionResult.fileId,
            });
            
            handleClose();
          } else {
            console.error("Failed to create Claude Code session");
          }
        } catch (error) {
          console.error("Error creating Claude Code session:", error);
        }
        break;
      case 'search-chat':
        // Enter search mode
        setSearchValue("");
        setSearchMode(true);
        setSelectedIndex(0);
        setSearchResults([]);
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
            placeholder={inputMode ? inputMode.placeholder : searchMode ? "Search files and messages..." : "Search"}
            value={searchValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-full pl-8 pr-12 h-[24px] bg-sidebar-accent rounded text-base md:text-xs focus:outline-none text-foreground transition-colors"
            style={{ 
              border: '1px solid var(--border-subtle)',
              WebkitAppearance: 'none'
            }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
            ⌘K
          </div>
        </div>
        
        {searchMode ? (
          <SearchResults
            isOpen={isCommandPaletteOpen}
            searchValue={searchValue}
            results={searchResults}
            selectedIndex={selectedIndex}
            onSelectedIndexChange={setSelectedIndex}
            onSelectResult={handleSearchResultSelect}
            isLoading={searchValue.trim().length > 2 && !searchQueryResults}
          />
        ) : (
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            selectedIndex={selectedIndex}
            onSelectedIndexChange={setSelectedIndex}
            onExecuteCommand={executeCommand}
            inputMode={inputMode}
          />
        )}
      </div>
    </div>
  );
}