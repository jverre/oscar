"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";

export default function OrgTeamPage() {
  const params = useParams();
  const orgName = params.org as string;
  const teamName = params.team as string;
  
  // Get org and team by name to verify they exist
  const organization = useQuery(api.organizations.getByName, { name: orgName });
  const team = useQuery(
    api.teams.getByOrgAndName,
    organization ? { organizationId: organization._id, name: teamName } : "skip"
  );

  // Show loading state while fetching org/team data
  if (organization === undefined || team === undefined) {
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

  // Show 404 if org or team doesn't exist
  if (!organization || !team) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col h-full px-6">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-xl font-medium text-foreground">Not Found</div>
              <div className="text-muted-foreground">
                Organization or team not found.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show welcome screen for valid org/team without file
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