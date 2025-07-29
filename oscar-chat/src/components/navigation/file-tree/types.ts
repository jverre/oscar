import { Id } from "../../../../convex/_generated/dataModel";

export interface FileTreeProps {
  organizationId: Id<"organizations">;
}

export type TreeNode = {
  id: string;
  name: string;
  path: string;
  children?: TreeNode[];
  isFile: boolean;
  isPending?: boolean;
  isEditing?: boolean;
  fileId?: Id<"files">;
  type: 'user';
  isPublic?: boolean;
};


export interface TreeNodeComponentProps {
  node: TreeNode;
  level?: number;
  onSaveCreating?: (name: string) => void;
  onCancelCreating?: () => void;
  onDelete?: (fileId?: Id<"files">, folderPath?: string) => void;
  onRename?: (fileId: Id<"files">, newName: string) => void;
  onToggleVisibility?: (fileId: Id<"files">) => void;
  organizationId: Id<"organizations"> | null;
}

export interface FileGroupSectionProps {
  title: string;
  files: unknown[];
  icon: React.ReactNode;
  isPublic: boolean;
  creatingItem: { type: 'file' | 'folder', isPublic: boolean } | null;
  onSaveCreating: (name: string) => void;
  onCancelCreating: () => void;
  onDelete: (fileId?: Id<"files">, folderPath?: string) => void;
  onRename: (fileId: Id<"files">, newName: string) => void;
  onToggleVisibility: (fileId: Id<"files">) => void;
  organizationId: Id<"organizations"> | null;
}

export interface FilesHeaderProps {
  onCreateFile: (isPublic?: boolean) => void;
  onCreateFolder: (isPublic?: boolean) => void;
}

export interface InlineEditorProps {
  initialName: string;
  isFile: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
} 