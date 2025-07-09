"use client";

import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";

export default function OrgPage() {
  const { organization, isLoading } = useCurrentOrganization();

  // Show loading state while fetching org data
  if (isLoading) {
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

  // Show welcome screen for valid organization without file
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col h-full px-6">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto py-2">
            <WelcomeScreen />
          </div>
        </div>
      </div>
    </div>
  );
}