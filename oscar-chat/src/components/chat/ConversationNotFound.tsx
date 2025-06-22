"use client";

import { useRouter } from "next/navigation";

export function ConversationNotFound() {
    const router = useRouter();

    const handleGoHome = () => {
        router.push("/chat");
    };

    return (
        <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Conversation Not Found</h1>
                    <p className="text-muted-foreground">
                        The conversation you're looking for doesn't exist or has been deleted.
                    </p>
                </div>
                <div className="space-y-4">
                    <button
                        onClick={handleGoHome}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        Start New Chat
                    </button>
                    <div className="text-sm text-muted-foreground font-mono">
                        Error 404: Conversation not found
                    </div>
                </div>
            </div>
        </div>
    );
}