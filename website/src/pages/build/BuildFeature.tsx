import Chat from './components/chat/chat';
import { Terminal } from './components/terminal/Terminal';
import { SandboxStatus } from './components/SandboxStatus';
import { useQuery } from '@tanstack/react-query';
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from 'react';

interface BuildFeatureProps {
  repositoryName: string
  featureName: string
}

export function BuildFeature({ repositoryName, featureName }: BuildFeatureProps) {{
    const chatId = `${repositoryName}-${featureName}`;
    const terminalSessionId = `terminal-${chatId}`;
    const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(true);
    const getByNameAction = useAction(api.featureBranches.getByName);

    const { data: featureBranch, refetch } = useQuery({
      queryKey: ['featureBranch', repositoryName, featureName],
      queryFn: () => getByNameAction({
        repositoryName: repositoryName,
        featureName: featureName
      }),
      refetchInterval: 5000, // Refetch every 5 seconds
    });

    const chatBaseUrl = `https://43021-${featureBranch?.sandboxId}.proxy.daytona.works`;

    useEffect(() => {
      console.log('[BuildFeature] Feature branch updated:', {
        sandboxId: featureBranch?.sandboxId,
        sandboxStatus: featureBranch?.sandboxStatus,
        sandboxUrl: featureBranch?.sandboxUrl,
        sandboxUrlToken: featureBranch?.sandboxUrlToken ? '***' : 'undefined',
        chatBaseUrl
      });
    }, [featureBranch, chatBaseUrl]);

    const chatData = useQuery({
      queryKey: ['chatData', chatId, featureBranch?.sandboxStatus],
      queryFn: async () => {
        if (!featureBranch || featureBranch.sandboxStatus !== "running") {
          return null;
        }
        console.log('[BuildFeature] Fetching chat data from:', `${chatBaseUrl}/chat/${chatId}`);
        const response = await fetch(`${chatBaseUrl}/chat/${chatId}`, {
          headers: {
            'x-daytona-preview-token': `${featureBranch?.sandboxUrlToken}`,
            'x-daytona-skip-preview-warning': 'true',
            'X-Daytona-Disable-CORS': 'true'
          }
        });

        if (!response.ok) {
          console.error('[BuildFeature] Failed to fetch chat data:', response.status);
          return { id: chatId, messages: [] };
        }

        const data = await response.json();
        console.log('[BuildFeature] Chat data loaded:', data);
        return data;
      },
      enabled: featureBranch?.sandboxStatus === "running",
    });
    if (!featureBranch) {
      return <SandboxStatus />;
    }

    if (featureBranch.sandboxStatus !== "running") {
      return <SandboxStatus status={featureBranch.sandboxStatus} />;
    }

    if (featureBranch.sandboxStatus === "running") {

      return (
        <div className="w-full h-full flex flex-col overflow-hidden">
          <div className={isTerminalCollapsed ? 'flex-1 overflow-hidden' : 'flex-[2] overflow-hidden'}>
            <Chat
              chatData={chatData.data || { id: chatId, messages: [] }}
              previewToken={featureBranch.sandboxUrlToken || ''}
              chatUrl={`${chatBaseUrl}/chat`}
              resume={!!chatData.data?.activeStreamId}
            />
          </div>

          <div className={isTerminalCollapsed ? 'flex-shrink-0' : 'flex-1 overflow-hidden'}>
            <Terminal
              sessionId={terminalSessionId}
              baseUrl={chatBaseUrl}
              previewToken={featureBranch.sandboxUrlToken || ''}
              isCollapsed={isTerminalCollapsed}
              onToggleCollapse={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
            />
          </div>
        </div>
      )
    }
    
    return null;
  }
}