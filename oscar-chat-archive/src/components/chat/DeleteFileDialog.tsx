"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface DeleteFileDialogProps {
  isOpen: boolean;
  fileName?: string;
  fileCount?: number;
  onClose: () => void;
  onConfirm: () => void;
}

const DONT_ASK_KEY = "oscar-chat-delete-no-confirm";

export function DeleteFileDialog({
  isOpen,
  fileName,
  fileCount,
  onClose,
  onConfirm,
}: DeleteFileDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    // Check if user has opted to not show confirmation
    const skipConfirm = localStorage.getItem(DONT_ASK_KEY) === "true";
    if (skipConfirm && isOpen) {
      onConfirm();
      onClose();
    }
  }, [isOpen, onConfirm, onClose]);

  const handleConfirm = () => {
    if (dontAskAgain) {
      localStorage.setItem(DONT_ASK_KEY, "true");
    }
    onConfirm();
    onClose();
  };

  const handleClose = () => {
    setDontAskAgain(false);
    onClose();
  };

  // Don't render if user has opted out of confirmations
  if (localStorage.getItem(DONT_ASK_KEY) === "true") {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[425px] bg-sidebar border-sidebar-border [&>button]:text-sidebar-foreground [&>button]:hover:text-foreground"
        style={{ 
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--sidebar)'
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-sidebar-foreground text-sm font-normal">
            {fileCount ? `Delete ${fileCount} Files` : "Delete File"}
          </DialogTitle>
          <DialogDescription className="text-sidebar-foreground/70 text-xs pt-2">
            {fileCount 
              ? `Are you sure you want to delete ${fileCount} selected files?`
              : `Are you sure you want to delete "${fileName}"?`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 py-4">
          <Checkbox
            id="dontAsk"
            checked={dontAskAgain}
            onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
            className="border-sidebar-foreground/30 data-[state=checked]:bg-sidebar-accent data-[state=checked]:border-sidebar-accent"
          />
          <label
            htmlFor="dontAsk"
            className="text-xs text-sidebar-foreground/70 cursor-pointer select-none"
          >
            Don't ask me again
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            className="text-xs text-sidebar-foreground"
            style={{ backgroundColor: 'var(--status-error)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--status-error-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--status-error)'}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}