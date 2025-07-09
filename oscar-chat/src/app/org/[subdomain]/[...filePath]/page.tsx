"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { MessageList } from "@/components/chat/MessageList";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { ClaudeSessionViewer } from "@/components/chat/ClaudeSessionViewer";
import { ClaudeCodeViewer } from "@/components/chat/ClaudeCodeViewer";
import { FileNotFound } from "@/components/chat/FileNotFound";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

export default function FilePage() {
  const params = useParams();
  const filePath = params.filePath as string[];
  const { organization, isLoading: orgLoading } = useCurrentOrganization();
  
  // Decode the file path and get the file
  const fileName = decodeURIComponent(filePath.join("/"));
  const file = useQuery(
    api.files.getByName,
    organization ? { organizationId: organization._id, name: fileName } : "skip"
  );

  // Show loading state while fetching data
  if (orgLoading || file === undefined) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col h-full px-6">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show 404 if organization doesn't exist
  if (!organization) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col h-full px-6">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-xl font-medium text-foreground">Organization Not Found</div>
              <div className="text-muted-foreground">
                This organization could not be found.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show 404 if file doesn't exist
  if (!file) {
    return <FileNotFound fileName={fileName} />;
  }

  // Determine file type and render appropriate component
  const fileExtension = fileName.split('.').pop();
  
  switch (fileExtension) {
    case 'blog':
      return <BlogEditor fileId={file._id} />;
    case 'claude':
      return <ClaudeSessionViewer fileId={file._id} />;
    case 'claude_session':
      return <ClaudeCodeViewer fileId={file._id} />;
    case 'chat':
    default:
      return <MessageList fileId={file._id} />;
  }
}