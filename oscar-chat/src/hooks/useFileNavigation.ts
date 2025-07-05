import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { useTabContext } from "@/contexts/TabContext";
import { buildFileUrl } from "@/utils/fileUrlUtils";
import { useSidebar } from "@/components/ui/sidebar";

interface NavigationOptions {
  userOrg?: Doc<"organizations">;
  userTeam?: Doc<"teams">;
}

export function useFileNavigation(options: NavigationOptions = {}) {
  const router = useRouter();
  const { addTab, closeTab, closeTabs, getTabByFile, isTabOpenByFile, switchToTab, updateTabTitle } = useTabContext();
  const { setOpenMobile, isMobile } = useSidebar();
  
  const openFile = useCallback((file: Doc<"files">) => {
    const url = buildFileUrl(
      file,
      options.userOrg ? { name: options.userOrg.name } : undefined,
      options.userTeam ? { name: options.userTeam.name } : undefined
    );
    
    const existingTab = getTabByFile(file._id);
    
    if (existingTab) {
      switchToTab(existingTab.id);
    } else {
      const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      addTab({
        id: tabId,
        title: file.name || "Untitled",
        fileId: file._id
      });
      // Don't call switchToTab here - ADD_TAB action already sets the tab as active
    }
    
    router.push(url);
    
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [router, addTab, getTabByFile, switchToTab, options.userOrg, options.userTeam, isMobile, setOpenMobile]);
  
  const closeFile = useCallback((fileId: Id<"files">) => {
    const tab = getTabByFile(fileId);
    if (tab) {
      closeTab(tab.id);
    }
  }, [getTabByFile, closeTab]);
  
  const closeMultipleFiles = useCallback((fileIds: Id<"files">[]) => {
    const tabIds = fileIds
      .map(fileId => getTabByFile(fileId))
      .filter(tab => tab !== undefined)
      .map(tab => tab!.id);
    
    if (tabIds.length > 0) {
      closeTabs(tabIds);
    }
  }, [getTabByFile, closeTabs]);
  
  const updateFileTabTitle = useCallback((fileId: Id<"files">, newTitle: string) => {
    updateTabTitle(fileId, newTitle);
  }, [updateTabTitle]);
  
  const isFileOpen = useCallback((fileId: Id<"files">) => {
    return isTabOpenByFile(fileId);
  }, [isTabOpenByFile]);
  
  const openMultipleFiles = useCallback((files: Doc<"files">[]) => {
    files.forEach(file => openFile(file));
  }, [openFile]);
  
  return {
    openFile,
    closeFile,
    closeMultipleFiles,
    updateFileTabTitle,
    isFileOpen,
    openMultipleFiles,
  };
}