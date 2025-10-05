import Chat from './components/chat/chat';
import { Terminal } from './components/terminal/Terminal';
import { SandboxStatus } from './components/SandboxStatus';
import { useQuery } from '@tanstack/react-query';
import { useQuery as useConvexQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from 'react';

interface BuildFeatureProps {
  repositoryName: string
  featureName: string
}

export function BuildFeature({ repositoryName, featureName }: BuildFeatureProps) {{
    const chatId = `${repositoryName}-${featureName}`;
    const terminalSessionId = `terminal-${chatId}`;
    const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(true);
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
    if (!featureBranch) {
      return <SandboxStatus />;
    }

    if (featureBranch.sandboxStatus !== "running") {
      return <SandboxStatus status={featureBranch.sandboxStatus} />;
    }

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
    );
  }
}