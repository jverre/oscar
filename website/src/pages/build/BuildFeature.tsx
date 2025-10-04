import Chat from './components/chat/chat';
import { Terminal } from './components/terminal/Terminal';
import { useQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface BuildFeatureProps {
  repositoryName: string
  featureName: string
}

export function BuildFeature({ repositoryName, featureName }: BuildFeatureProps) {{
    const chatId = `${repositoryName}-${featureName}`;
    const terminalSessionId = `terminal-${chatId}`;
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
      <div className="max-h-full w-full h-full">
        <PanelGroup direction="vertical">
          <Panel defaultSize={70} minSize={30}>
            <Chat
              chatData={chatData.data || { id: chatId, messages: [] }}
              previewToken={featureBranch?.sandboxUrlToken || ''}
              chatUrl={`${chatBaseUrl}/chat`}
              resume={chatData.data?.activeStreamId !== null}
            />
          </Panel>

          <PanelResizeHandle className="h-px bg-sage-green-200 hover:bg-sage-green-400 transition-colors cursor-row-resize" />

          <Panel defaultSize={30} minSize={20}>
            <Terminal
              sessionId={terminalSessionId}
              baseUrl={chatBaseUrl}
              previewToken={featureBranch?.sandboxUrlToken || ''}
            />
          </Panel>
        </PanelGroup>
      </div>
    );
  }
}