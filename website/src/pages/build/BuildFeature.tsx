import Chat from './components/chat/chat';
import { useQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface BuildFeatureProps {
  repositoryName: string
  featureName: string
}

export function BuildFeature({ repositoryName, featureName }: BuildFeatureProps) {{
    const chatId = `${repositoryName}-${featureName}`;
    const featureBranch = useConvexQuery(api.featureBranches.getByName, {
      repositoryName: repositoryName,
      featureName: featureName
    });
    
    const chatBaseUrl = `https://43021-${featureBranch?.sandboxId}.proxy.daytona.works`;

    const chatData = useQuery({
      queryKey: ['chatData', chatId], 
      queryFn: async () => {
        if (!featureBranch || featureBranch.sandboxStatus !== "running") {
          return null;
        }
        const response = await fetch(`${chatBaseUrl}/chat/${chatId}`, {
          headers: {
            'x-daytona-preview-token': `${featureBranch?.sandboxUrlToken}`,
            'x-daytona-skip-preview-warning': 'true',
            'X-Daytona-Disable-CORS': 'true'
          }
        });
        return await response.json();
      }
    });
    const isLoading = chatData.isLoading || !featureBranch || featureBranch?.sandboxStatus !== "running";
    const isError = chatData.isError;

    if (isLoading || !featureBranch) {
      return <div>Loading...</div>;
    }
    
    if (isError) {
      return <div>Error: {chatData.error.message}</div>;
    }

    return (
      <div className="max-h-full w-full">
        <Chat
          chatData={chatData.data || { id: chatId, messages: [] }}
          previewToken={featureBranch?.sandboxUrlToken || ''}
          chatUrl={`${chatBaseUrl}/chat`}
          resume={chatData.data?.activeStreamId !== null}
        />
      </div>
    );
  }
}