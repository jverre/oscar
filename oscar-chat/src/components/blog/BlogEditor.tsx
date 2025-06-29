"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CommandDropdown, type CommandDropdownItem } from "@/components/ui/command-dropdown";
import { Type, Heading1, Heading2, Heading3, List, ListOrdered, Code, Quote } from "lucide-react";

interface BlogEditorProps {
  fileId: Id<"files">;
}

interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  searchTerms: string[];
  command: ({ editor, range }: { editor: any; range: any }) => void;
}

// Define slash commands with icons
const allCommands: SlashCommand[] = [
  {
    id: "text",
    title: "Text",
    description: "Start writing with plain text",
    icon: <Type className="w-4 h-4" />,
    searchTerms: ["text", "paragraph", "p"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    id: "heading-1",
    title: "Heading 1",
    description: "Big section heading",
    icon: <Heading1 className="w-4 h-4" />,
    searchTerms: ["title", "big", "large", "h1", "heading"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    id: "heading-2",
    title: "Heading 2", 
    description: "Medium section heading",
    icon: <Heading2 className="w-4 h-4" />,
    searchTerms: ["subtitle", "medium", "h2", "heading"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    id: "heading-3",
    title: "Heading 3",
    description: "Small section heading",
    icon: <Heading3 className="w-4 h-4" />,
    searchTerms: ["small", "h3", "heading"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    id: "bullet-list",
    title: "Bullet List",
    description: "Create a simple bullet list",
    icon: <List className="w-4 h-4" />,
    searchTerms: ["bullet", "list", "ul", "unordered"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "numbered-list",
    title: "Numbered List", 
    description: "Create a list with numbering",
    icon: <ListOrdered className="w-4 h-4" />,
    searchTerms: ["numbered", "list", "ol", "ordered"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "code-block",
    title: "Code Block",
    description: "Create a code block",
    icon: <Code className="w-4 h-4" />,
    searchTerms: ["code", "codeblock", "monospace"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: "quote",
    title: "Quote",
    description: "Create a quote block",
    icon: <Quote className="w-4 h-4" />,
    searchTerms: ["quote", "blockquote", "citation"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
];

// Create the custom slash command extension
const createSlashCommandExtension = (
  onStart: (props: any) => void,
  onUpdate: (props: any) => void,
  onKeyDown: (props: any) => boolean,
  onExit: () => void
) => Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return allCommands
            .filter(item =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.searchTerms.some(term => 
                term.toLowerCase().includes(query.toLowerCase())
              )
            )
            .slice(0, 10);
        },
        render: () => ({
          onStart,
          onUpdate,
          onKeyDown,
          onExit,
        }),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export function BlogEditor({ fileId }: BlogEditorProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuItems, setSlashMenuItems] = useState<SlashCommand[]>([]);
  const [slashMenuIndex, setSlashMenuIndex] = useState(0);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);
  
  // Use refs to access current values in callbacks
  const slashMenuIndexRef = useRef(0);
  const slashMenuItemsRef = useRef<SlashCommand[]>([]);
  
  // Get or create blog document
  const getOrCreateBlog = useMutation(api.blogs.getOrCreate);
  const updateBlog = useMutation(api.blogs.update);
  const blog = useQuery(api.blogs.get, { fileId });

  // Auto-save logic with debouncing
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Update refs when state changes
  useEffect(() => {
    slashMenuIndexRef.current = slashMenuIndex;
  }, [slashMenuIndex]);
  
  useEffect(() => {
    slashMenuItemsRef.current = slashMenuItems;
  }, [slashMenuItems]);

  const handleAutoSave = (content: any) => {
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateBlog({
          fileId,
          content,
        });
      } catch (error) {
        console.error("Failed to save blog:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Save after 1 second of inactivity

    setSaveTimeout(timeout);
  };

  // Create the extension with callbacks
  const slashCommandExtension = useMemo(() => createSlashCommandExtension(
    (props) => {
      setSlashMenuItems(props.items);
      setSlashMenuIndex(0);
      setSlashMenuOpen(true);
      setSlashRange({ from: props.range.from, to: props.range.to });
      
      // Position menu near cursor
      const { view } = props.editor;
      const coords = view.coordsAtPos(props.range.from);
      setSlashMenuPosition({
        top: coords.bottom + 10,
        left: coords.left,
      });
    },
    (props) => {
      setSlashMenuItems(props.items);
      setSlashMenuIndex(0);
      setSlashRange({ from: props.range.from, to: props.range.to });
    },
    (props) => {
      if (!props.items || props.items.length === 0) {
        return false;
      }
      
      if (props.event.key === 'ArrowDown') {
        const currentIndex = slashMenuIndexRef.current;
        const newIndex = currentIndex < props.items.length - 1 ? currentIndex + 1 : currentIndex;
        setSlashMenuIndex(newIndex);
        return true;
      }
      
      if (props.event.key === 'ArrowUp') {
        const currentIndex = slashMenuIndexRef.current;
        const newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
        setSlashMenuIndex(newIndex);
        return true;
      }
      
      if (props.event.key === 'Enter') {
        const currentIndex = slashMenuIndexRef.current;
        const selectedItem = props.items[currentIndex];
        if (selectedItem && currentIndex >= 0 && currentIndex < props.items.length) {
          selectedItem.command({ editor: props.editor, range: props.range });
          setSlashMenuOpen(false);
          setSlashRange(null);
        }
        return true;
      }
      
      if (props.event.key === 'Escape') {
        setSlashMenuOpen(false);
        setSlashRange(null);
        return true;
      }
      
      return false;
    },
    () => {
      setSlashMenuOpen(false);
      setSlashRange(null);
    }
  ), []);

  // Initialize editor with Suggestion extension
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start writing...",
        emptyNodeClass: "is-empty",
      }),
      slashCommandExtension,
    ],
    content: blog?.content || { type: "doc", content: [] },
    onUpdate: ({ editor }) => {
      // Auto-save after a delay
      handleAutoSave(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[500px] px-4 py-2",
      },
    },
  });

  // Initialize blog document on mount
  useEffect(() => {
    if (!isInitialized && fileId) {
      getOrCreateBlog({ fileId }).then(() => {
        setIsInitialized(true);
      });
    }
  }, [fileId, isInitialized, getOrCreateBlog]);

  // Update editor content when blog data changes
  useEffect(() => {
    if (editor && blog && blog.content && !editor.isDestroyed) {
      const currentContent = editor.getJSON();
      // Only update if content is different to avoid cursor jumping
      if (JSON.stringify(currentContent) !== JSON.stringify(blog.content)) {
        editor.commands.setContent(blog.content);
      }
    }
  }, [blog, editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const handleCommand = (item: SlashCommand) => {
    if (editor && slashRange) {
      item.command({ editor, range: slashRange });
      setSlashMenuOpen(false);
      setSlashRange(null);
    }
  };

  // Convert commands to dropdown items
  const commandDropdownItems: CommandDropdownItem[] = slashMenuItems.map(item => ({
    id: item.id,
    title: item.title,
    icon: item.icon,
    onClick: () => handleCommand(item)
  }));

  if (!editor || !isInitialized) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-secondary)' 
        }}>Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="max-w-4xl mx-auto" style={{ padding: '8px' }}>
          <EditorContent editor={editor} />
          
          {/* Slash command menu */}
          <CommandDropdown
            isOpen={slashMenuOpen}
            onClose={() => {
              setSlashMenuOpen(false);
              setSlashRange(null);
            }}
            items={commandDropdownItems}
            selectedIndex={slashMenuIndex}
            onSelectedIndexChange={setSlashMenuIndex}
            position={slashMenuPosition}
          />
        </div>
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 100%;
          font-family: -apple-system, "system-ui", sans-serif;
          font-size: 12px;
          line-height: 18px;
        }

        .ProseMirror p.is-empty::before {
          content: attr(data-placeholder);
          color: var(--text-secondary);
          pointer-events: none;
          float: left;
          height: 0;
          font-size: 12px;
        }

        .ProseMirror h1 {
          font-size: 20px;
          font-weight: 500;
          margin-bottom: 8px;
          margin-top: 16px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .ProseMirror h2 {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 6px;
          margin-top: 12px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .ProseMirror h3 {
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 4px;
          margin-top: 8px;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .ProseMirror p {
          margin-bottom: 8px;
          line-height: 18px;
          color: var(--text-primary);
          font-size: 12px;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          margin-bottom: 8px;
          padding-left: 20px;
          color: var(--text-primary);
          font-size: 12px;
        }

        .ProseMirror li {
          margin-bottom: 2px;
          line-height: 18px;
        }

        .ProseMirror blockquote {
          border-left: 2px solid var(--border-subtle);
          padding-left: 12px;
          margin: 8px 0;
          font-style: italic;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .ProseMirror pre {
          background-color: var(--surface-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 8px;
          overflow-x: auto;
        }

        .ProseMirror code {
          font-family: monospace;
          font-size: 11px;
          color: var(--text-primary);
          background-color: var(--surface-secondary);
          padding: 1px 4px;
          border-radius: 2px;
        }

        .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
        }

        .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
}