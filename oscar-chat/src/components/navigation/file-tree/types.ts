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

export type PendingItem = {
  id: string;
  name: string;
  isFile: boolean;
  isPublic: boolean;
  parentPath?: string;
};

export interface TreeNodeComponentProps {
  node: TreeNode;
  level?: number;
  onSavePending?: (id: string, name: string) => void;
  onCancelPending?: (id: string) => void;
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
  pendingItems: PendingItem[];
  onSavePending: (id: string, name: string) => void;
  onCancelPending: (id: string) => void;
  onDelete: (fileId?: Id<"files">, folderPath?: string) => void;
  onRename: (fileId: Id<"files">, newName: string) => void;
  onToggleVisibility: (fileId: Id<"files">) => void;
  organizationId: Id<"organizations"> | null;
}

export interface FilesHeaderProps {
  organizationId: Id<"organizations"> | null;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

export interface InlineEditorProps {
  initialName: string;
  isFile: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
} 