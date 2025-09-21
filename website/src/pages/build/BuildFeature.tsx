import Chat from './components/chat/chat';

interface BuildFeatureProps {
  repositoryName: string
  featureName: string
}

export function BuildFeature({ repositoryName, featureName }: BuildFeatureProps) {{
    const chatId = `${repositoryName}-${featureName}`;
    const chatData = { id: chatId, messages: [], activeStreamId: null };
    
    return (
      <div className="h-full w-full">
        <Chat chatData={chatData} resume={chatData.activeStreamId !== null} />
      </div>
    );
  }
}