"use client";

import { Command as CommandIcon, FileText, Menu } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [fileNameInput, setFileNameInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const createFileMutation = useMutation(api.files.createFile);
  
  // Get user's organization info
  const user = useQuery(
    api.users.currentUser,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  const commands = [
    {
      id: "create-blog",
      title: "Create blog",
      icon: <FileText className="w-3 h-3" />,
    }
  ];

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(searchValue.toLowerCase())
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      
      if (open) {
        if (e.key === "Escape") {
          if (isCreatingFile) {
            setIsCreatingFile(false);
            setFileNameInput("");
            setSearchValue("");
          } else {
            setOpen(false);
            setSearchValue("");
            setSelectedIndex(0);
          }
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (isCreatingFile) {
            // Create the file
            handleCreateFile();
          } else if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex].id);
          }
        }
      }
    };

    const clickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchValue("");
        setSelectedIndex(0);
        setIsCreatingFile(false);
        setFileNameInput("");
      }
    };

    document.addEventListener("keydown", down);
    document.addEventListener("mousedown", clickOutside);
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("mousedown", clickOutside);
    };
  }, [open, selectedIndex, filteredCommands, isCreatingFile, fileNameInput, user]);

  const executeCommand = (commandId: string) => {
    if (commandId === "create-blog") {
      setIsCreatingFile(true);
      setSearchValue("");
      setFileNameInput("");
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      console.log(`Executing: ${commandId}`);
      setOpen(false);
      setSearchValue("");
      setSelectedIndex(0);
    }
  };

  const handleCreateFile = async () => {
    if (!fileNameInput.trim() || !user?.organization?._id || !session?.user?.id) {
      return;
    }

    try {
      const fileName = fileNameInput.trim();
      const filePath = fileName.endsWith('.blog') ? fileName : `${fileName}.blog`;
      
      console.log("Creating file with organizationId:", user.organization._id);
      
      await createFileMutation({
        userId: session.user.id as any,
        organizationId: user.organization._id,
        path: filePath,
        content: "",
        type: "blog",
        isPublic: false,
      });

      // Reset state
      setOpen(false);
      setIsCreatingFile(false);
      setFileNameInput("");
      setSearchValue("");
      setSelectedIndex(0);
      
      // TODO: Navigate to the created file or refresh file tree
      console.log(`Created blog file: ${filePath}`);
    } catch (error) {
      console.error("Failed to create file:", error);
      // TODO: Show error toast
    }
  };

  return (
    <header className="border-b border-border h-[28px] flex items-center px-4">
      {/* Left section */}
      <div className="flex-1 flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileMenuToggle}
          className="h-5 w-5 p-0 md:hidden"
        >
          <Menu className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Center section - Command center */}
      <div ref={containerRef} className="relative flex justify-center">
        <input
          ref={inputRef}
          type="text"
          value={isCreatingFile ? fileNameInput : searchValue}
          onChange={(e) => {
            if (isCreatingFile) {
              setFileNameInput(e.target.value);
            } else {
              setSearchValue(e.target.value);
              setSelectedIndex(0);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder={isCreatingFile ? "Enter blog file name..." : "Command center"}
          className="bg-transparent border border-border/50 rounded-sm px-3 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:border-muted w-64 h-5"
          style={{ lineHeight: '20px' }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 font-mono flex items-center pointer-events-none">
          <CommandIcon className="w-2.5 h-2.5" />
          <span className="text-[10px] ml-0.5">K</span>
        </span>
        
        {open && (
          <div 
            className="absolute top-full left-0 right-0 mt-0.5 rounded-sm shadow-lg z-50 bg-card border border-border/50"
            style={{ fontSize: '11px' }}
          >
            <div className="max-h-32 overflow-y-auto">
              {isCreatingFile ? (
                <div className="px-2 py-1 font-mono text-muted-foreground">
                  Type file name and press Enter to create .blog file
                </div>
              ) : (
                filteredCommands.length > 0 && filteredCommands.map((command, index) => (
                  <div
                    key={command.id}
                    className="flex items-center gap-2 px-2 py-1 cursor-pointer transition-colors font-mono"
                    style={{
                      backgroundColor: index === selectedIndex ? 'hsl(var(--accent) / 0.5)' : 'transparent',
                      lineHeight: '1.2'
                    }}
                    onClick={() => executeCommand(command.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex-shrink-0 text-muted-foreground">
                      {command.icon}
                    </div>
                    <div className="flex-1 min-w-0 truncate">
                      {command.title}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right section */}
      <div className="flex-1 flex justify-end">
        {/* Future: Add right-side controls here */}
      </div>
    </header>
  );
}