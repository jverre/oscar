import { Doc } from "../../convex/_generated/dataModel";

export interface FolderNode {
    name: string;
    path: string;
    files: Doc<"files">[];
    children: Map<string, FolderNode>;
    isExpanded: boolean;
    isGitRepo?: boolean;
    gitRepoFile?: Doc<"files">;
    isVisibilityContainer?: boolean; // For Public/Private folders
    visibility?: "public" | "private"; // The visibility type this container represents
}

export const buildFolderStructure = (files: Doc<"files">[]): FolderNode => {
    const root: FolderNode = {
        name: "",
        path: "",
        files: [],
        children: new Map(),
        isExpanded: true
    };

    // Create visibility containers
    const publicContainer: FolderNode = {
        name: "Public",
        path: "__public__",
        files: [],
        children: new Map(),
        isExpanded: true,
        isVisibilityContainer: true,
        visibility: "public"
    };

    const privateContainer: FolderNode = {
        name: "Private",
        path: "__private__",
        files: [],
        children: new Map(),
        isExpanded: true,
        isVisibilityContainer: true,
        visibility: "private"
    };

    // Separate files by visibility
    const publicFiles = files.filter(file => file.visibility === "public");
    const privateFiles = files.filter(file => file.visibility === "private" || !file.visibility);

    // Build folder structure within each visibility container
    [{ container: publicContainer, files: publicFiles }, { container: privateContainer, files: privateFiles }].forEach(({ container, files: visibilityFiles }) => {
        visibilityFiles.forEach(file => {
            const name = file.name;
            
            // Special handling for Git repos - create them as folders
            if (isGitRepo(name)) {
                const displayName = getGitRepoDisplayName(name);
                if (!container.children.has(displayName)) {
                    container.children.set(displayName, {
                        name: displayName,
                        path: `${container.path}/${displayName}`,
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
                    container.files.push(file);
                } else {
                    let currentNode = container;
                    const folderParts = parts.slice(0, -1);
                    
                    folderParts.forEach((folderName, index) => {
                        const folderPath = `${container.path}/${folderParts.slice(0, index + 1).join("/")}`;
                        
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
    });

    // Always add visibility containers (even when empty)
    root.children.set("Public", publicContainer);
    root.children.set("Private", privateContainer);

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