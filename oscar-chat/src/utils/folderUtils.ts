import { Doc } from "../../convex/_generated/dataModel";

export interface FolderNode {
    name: string;
    path: string;
    files: Doc<"files">[];
    children: Map<string, FolderNode>;
    isExpanded: boolean;
    isGitRepo?: boolean;
    gitRepoFile?: Doc<"files">;
}

export const buildFolderStructure = (files: Doc<"files">[]): FolderNode => {
    const root: FolderNode = {
        name: "",
        path: "",
        files: [],
        children: new Map(),
        isExpanded: true
    };

    files.forEach(file => {
        const name = file.name;
        
        // Special handling for Git repos - create them as folders
        if (isGitRepo(name)) {
            const displayName = getGitRepoDisplayName(name);
            if (!root.children.has(displayName)) {
                root.children.set(displayName, {
                    name: displayName,
                    path: displayName,
                    files: [],
                    children: new Map(),
                    isExpanded: false,
                    isGitRepo: true,
                    gitRepoFile: file
                });
            }
        } else {
            const parts = name.split("/");
            
            if (parts.length === 1) {
                root.files.push(file);
            } else {
                let currentNode = root;
                const folderParts = parts.slice(0, -1);
                
                folderParts.forEach((folderName, index) => {
                    const folderPath = folderParts.slice(0, index + 1).join("/");
                    
                    if (!currentNode.children.has(folderName)) {
                        currentNode.children.set(folderName, {
                            name: folderName,
                            path: folderPath,
                            files: [],
                            children: new Map(),
                            isExpanded: false
                        });
                    }
                    currentNode = currentNode.children.get(folderName)!;
                });
                
                currentNode.files.push(file);
            }
        }
    });

    return root;
};

export const getAllFilesInFolder = (folder: FolderNode): Doc<"files">[] => {
    const files = [...folder.files];
    
    folder.children.forEach(childFolder => {
        files.push(...getAllFilesInFolder(childFolder));
    });
    
    return files;
};

export const getFileDisplayName = (file: Doc<"files">): string => {
    const parts = file.name.split("/");
    return parts[parts.length - 1];
};

export const isGitRepo = (fileName: string): boolean => {
    return fileName.endsWith('.git');
};

export const getGitRepoDisplayName = (fileName: string): string => {
    if (!isGitRepo(fileName)) return fileName;
    
    // Remove .git extension and return user/repo format
    return fileName.replace('.git', '');
};