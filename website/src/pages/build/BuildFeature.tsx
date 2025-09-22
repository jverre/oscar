import Chat from './components/chat/chat';
import { useQuery } from '@tanstack/react-query';

interface BuildFeatureProps {
  repositoryName: string
  featureName: string
}

export function BuildFeature({ repositoryName, featureName }: BuildFeatureProps) {{
    const chatId = `${repositoryName}-${featureName}`;
    
    const chatData = useQuery({
      queryKey: ['chatData', chatId], 
      queryFn: async () => {
        const response = await fetch(`http://localhost:3001/chat/${chatId}`);
        console.log('respones', response);
        return await response.json();
      }
    });
    
    console.log(chatData, chatData.data);

    return (
      <div className="max-h-full w-full">
        {chatData.isLoading && <div>Loading...</div>}
        {chatData.isError && <div>Error: {chatData.error.message}</div>}
        {chatData.isSuccess && <Chat chatData={chatData.data || { id: chatId, messages: [] }} resume={chatData.data?.activeStreamId !== null} />}
      </div>
    );
  }
}