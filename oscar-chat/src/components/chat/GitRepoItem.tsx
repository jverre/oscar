"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, File, Folder, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderNode } from "@/utils/folderUtils";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface GitFileNode {
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
}

interface TreeNode {
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
    children?: TreeNode[];
}

interface GitRepoItemProps {
    folder: FolderNode;
    level: number;
    isSelected: boolean;
    onToggleExpanded: (folderPath: string) => void;
    onFolderClick: (folderPath: string, event?: React.MouseEvent) => void;
    onFolderContextMenu: (e: React.MouseEvent, folderPath: string) => void;
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper function to build tree structure from flat list
function buildTreeFromList(files: GitFileNode[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];
    
    // Create all nodes
    files.forEach(file => {
        nodeMap.set(file.path, {
            name: file.name,
            path: file.path,
            type: file.type,
            size: file.size,
            children: file.type === 'directory' ? [] : undefined,
        });
    });
    
    // Build parent-child relationships
    files.forEach(file => {
        const node = nodeMap.get(file.path)!;
        const pathParts = file.path.split('/');
        
        if (pathParts.length === 1) {
            // Root level
            rootNodes.push(node);
        } else {
            // Find parent
            const parentPath = pathParts.slice(0, -1).join('/');
            const parent = nodeMap.get(parentPath);
            if (parent && parent.children) {
                parent.children.push(node);
            }
        }
    });
    
    // Sort function: directories first, then files, both alphabetically
    const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
        return nodes.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    };
    
    // Recursively sort all levels
    const sortRecursively = (nodes: TreeNode[]): TreeNode[] => {
        const sorted = sortNodes(nodes);
        sorted.forEach(node => {
            if (node.children) {
                node.children = sortRecursively(node.children);
            }
        });
        return sorted;
    };
    
    return sortRecursively(rootNodes);
}



type GitRepoState = 
    | { type: "collapsed" }
    | { type: "cloning"; message: string }
    | { type: "files"; files: GitFileNode[]; expandedDirs: Set<string> };

export function GitRepoItem({
    folder,
    level,
    isSelected,
    onToggleExpanded,
    onFolderClick,
    onFolderContextMenu
}: GitRepoItemProps) {
    const [gitState, setGitState] = useState<GitRepoState>({ type: "collapsed" });
    
    const getRepoFiles = useAction(api.gitFiles.getRepoFiles);
    
    const indentLevel = level * 8;

    // Load repo files and handle polling for cloning state
    useEffect(() => {
        const loadRepoFiles = async () => {
            if (!folder.isExpanded || !folder.gitRepoFile) {
                if (gitState.type !== "collapsed") {
                    setGitState({ type: "collapsed" });
                }
                return;
            }

            try {
                const result = await getRepoFiles({
                    fileId: folder.gitRepoFile._id,
                    path: "", // Root path
                });

                if (result.status === "success") {
                    setGitState({
                        type: "files",
                        files: result.files || [],
                        expandedDirs: new Set()
                    });
                } else if (result.status === "cloning") {
                    setGitState({
                        type: "cloning",
                        message: result.message || "Repository is being cloned..."
                    });
                } else {
                    setGitState({
                        type: "files",
                        files: [],
                        expandedDirs: new Set()
                    });
                }
            } catch (err) {
                setGitState({
                    type: "files", 
                    files: [],
                    expandedDirs: new Set()
                });
            }
        };

        loadRepoFiles();
    }, [folder.isExpanded, folder.gitRepoFile?._id, getRepoFiles]);

    // Polling effect for cloning state
    useEffect(() => {
        if (gitState.type !== "cloning" || !folder.isExpanded || !folder.gitRepoFile) {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const result = await getRepoFiles({
                    fileId: folder.gitRepoFile._id,
                    path: "",
                });

                if (result.status === "success") {
                    setGitState({
                        type: "files",
                        files: result.files || [],
                        expandedDirs: new Set()
                    });
                } else if (result.status !== "cloning") {
                    setGitState({
                        type: "files",
                        files: [],
                        expandedDirs: new Set()
                    });
                }
            } catch (err) {
                setGitState({
                    type: "files",
                    files: [],
                    expandedDirs: new Set()
                });
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(pollInterval);
    }, [gitState.type, folder.isExpanded, folder.gitRepoFile?._id, getRepoFiles]);

    // Handle expanding/collapsing directories within the repository
    const handleDirectoryToggle = (dirPath: string) => {
        if (gitState.type !== "files") return;

        const { expandedDirs } = gitState;
        const newExpandedDirs = new Set(expandedDirs);

        if (expandedDirs.has(dirPath)) {
            newExpandedDirs.delete(dirPath);
        } else {
            newExpandedDirs.add(dirPath);
        }

        setGitState({
            ...gitState,
            expandedDirs: newExpandedDirs
        });
    };

    const handleToggleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleExpanded(folder.path);
    };

    const handleFolderClick = (e: React.MouseEvent) => {
        onFolderClick(folder.path, e);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        onFolderContextMenu(e, folder.path);
    };

    // Build tree structure from flat list and render
    const renderFileTree = (): React.ReactNode[] => {
        if (gitState.type !== "files") return [];
        
        const { files, expandedDirs } = gitState;
        const elements: React.ReactNode[] = [];
        
        // Build a tree structure from the flat list
        const tree = buildTreeFromList(files);
        
        const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
            const itemLevel = level + 1 + depth;
            const paddingLeft = `${20 + (itemLevel * 16)}px`;
            
            if (node.type === 'directory') {
                const isExpanded = expandedDirs.has(node.path);
                
                return (
                    <div key={node.path}>
                        {/* Directory item */}
                        <div
                            className="h-[22px] flex items-center text-[13px] cursor-pointer text-sidebar-foreground truncate select-none"
                            style={{ paddingLeft }}
                            onClick={() => handleDirectoryToggle(node.path)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <div className="w-4 h-4 flex items-center justify-center mr-1">
                                {isExpanded ? (
                                    <ChevronDown className="w-3 h-3" style={{ opacity: 0.6 }} />
                                ) : (
                                    <ChevronRight className="w-3 h-3" style={{ opacity: 0.6 }} />
                                )}
                            </div>
                            <Folder className="w-3 h-3 mr-2 flex-shrink-0" style={{ opacity: 0.6 }} />
                            <span style={{ opacity: 0.8 }}>{node.name}</span>
                        </div>
                        
                        {/* Directory contents */}
                        {isExpanded && node.children && (
                            <div>
                                {node.children.map(child => renderNode(child, depth + 1))}
                            </div>
                        )}
                    </div>
                );
            } else {
                // File item
                return (
                    <div
                        key={node.path}
                        className="h-[22px] flex items-center text-[13px] cursor-pointer text-sidebar-foreground truncate select-none"
                        style={{ paddingLeft }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <div className="w-4 h-4 mr-1" /> {/* Spacer for alignment */}
                        <File className="w-3 h-3 mr-2 flex-shrink-0" style={{ opacity: 0.6 }} />
                        <span style={{ opacity: 0.8 }}>{node.name}</span>
                        {node.size !== undefined && (
                            <span 
                                className="ml-auto text-xs"
                                style={{ 
                                    opacity: 0.5,
                                    marginRight: '8px'
                                }}
                            >
                                {formatFileSize(node.size)}
                            </span>
                        )}
                    </div>
                );
            }
        };
        
        tree.forEach(node => {
            elements.push(renderNode(node));
        });
        
        return elements;
    };

    return (
        <>
            {/* Git Repo Folder */}
            <div
                className={cn(
                    "flex items-center h-[22px] text-[13px] cursor-pointer text-sidebar-foreground select-none relative",
                    isSelected && "bg-sidebar-accent"
                )}
                style={{ 
                    paddingLeft: `${20 + indentLevel}px`,
                    paddingRight: '8px',
                    backgroundColor: isSelected ? 'var(--interactive-primary)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}
                onClick={handleFolderClick}
                onContextMenu={handleContextMenu}
            >
                <button
                    onClick={handleToggleClick}
                    className="absolute flex items-center justify-center"
                    style={{ 
                        left: `${4 + indentLevel}px`,
                        width: '16px',
                        height: '22px',
                        backgroundColor: 'transparent'
                    }}
                >
                    {folder.isExpanded ? (
                        <ChevronDown className="w-4 h-4" style={{ opacity: 0.6 }} />
                    ) : (
                        <ChevronRight className="w-4 h-4" style={{ opacity: 0.6 }} />
                    )}
                </button>
                
                <span className="truncate" style={{ 
                    opacity: 0.8, 
                    marginLeft: '4px',
                    color: isSelected ? 'white' : 'inherit'
                }}>{folder.name}</span>
            </div>

            {/* Repository content based on single state */}
            {folder.isExpanded && (
                <>
                    {gitState.type === "cloning" && (
                        <div 
                            className="h-[22px] flex items-center text-[13px] text-sidebar-foreground"
                            style={{ 
                                paddingLeft: `${20 + ((level + 1) * 16)}px`,
                                opacity: 0.6,
                            }}
                        >
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            {gitState.message}
                        </div>
                    )}
                    
                    {gitState.type === "files" && (() => {
                        return renderFileTree();
                    })()}
                    
                    {gitState.type === "collapsed" && (
                        <div 
                            className="h-[22px] flex items-center text-[13px] text-sidebar-foreground"
                            style={{ 
                                paddingLeft: `${20 + ((level + 1) * 16)}px`,
                                opacity: 0.6,
                            }}
                        >
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                            Loading...
                        </div>
                    )}
                </>
            )}
        </>
    );
}