import { Doc } from "../../convex/_generated/dataModel";

export interface FolderNode {
    name: string;
    path: string;
    conversations: Doc<"conversations">[];
    children: Map<string, FolderNode>;
    isExpanded: boolean;
}

export const buildFolderStructure = (conversations: Doc<"conversations">[]): FolderNode => {
    const root: FolderNode = {
        name: "",
        path: "",
        conversations: [],
        children: new Map(),
        isExpanded: true
    };

    conversations.forEach(conversation => {
        const title = conversation.title;
        const parts = title.split("/");
        
        if (parts.length === 1) {
            root.conversations.push(conversation);
        } else {
            let currentNode = root;
            const folderParts = parts.slice(0, -1);
            
            folderParts.forEach((folderName, index) => {
                const folderPath = folderParts.slice(0, index + 1).join("/");
                
                if (!currentNode.children.has(folderName)) {
                    currentNode.children.set(folderName, {
                        name: folderName,
                        path: folderPath,
                        conversations: [],
                        children: new Map(),
                        isExpanded: false
                    });
                }
                currentNode = currentNode.children.get(folderName)!;
            });
            
            currentNode.conversations.push(conversation);
        }
    });

    return root;
};

export const getAllConversationsInFolder = (folder: FolderNode): Doc<"conversations">[] => {
    const conversations = [...folder.conversations];
    
    folder.children.forEach(childFolder => {
        conversations.push(...getAllConversationsInFolder(childFolder));
    });
    
    return conversations;
};

export const getConversationDisplayName = (conversation: Doc<"conversations">): string => {
    const parts = conversation.title.split("/");
    return parts[parts.length - 1];
};