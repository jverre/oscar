import React, { useState, useRef, useEffect } from "react";
import { InlineEditorProps } from "./types";

export const InlineEditor = ({ 
  initialName, 
  onSave, 
  onCancel 
}: Omit<InlineEditorProps, 'isFile'>) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (name.trim()) {
        onSave(name.trim());
      } else {
        onCancel();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    if (name.trim()) {
      onSave(name.trim());
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="bg-transparent text-xs leading-none outline-none border-none p-0 w-full"
      style={{ minWidth: '60px' }}
    />
  );
}; 