import { lsTools } from "./ls";

// Export file system tools (now using ls instead of list_files)
export const fileSystemTools = {
  ...lsTools,
};