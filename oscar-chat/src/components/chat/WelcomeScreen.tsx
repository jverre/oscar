"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useChatCreation } from "@/hooks/useChatCreation";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

interface WelcomeScreenProps {
    // No props needed - using useChatCreation hook directly
}

export function WelcomeScreen({}: WelcomeScreenProps) {
    const { createChat, isCreating } = useChatCreation();
    const router = useRouter();
    const conversations = useQuery(api.conversations.list);

    const recentConversations = conversations?.slice(0, 5) || [];

    const handleCreateChat = async () => {
        await createChat({
            title: "New Chat",
            navigate: true
        });
    };

    const handleConversationClick = (conversationId: string) => {
        router.push(`/chat?conversation=${conversationId}`);
    };

    return (
        <div 
            className="h-full flex flex-col items-center justify-center"
            style={{ 
                padding: '48px',
                gap: '24px',
                minWidth: '420px',
                maxWidth: '420px',
                margin: '0 auto'
            }}
        >
            {/* Logo and Branding */}
            <div className="flex items-center w-full" style={{ gap: '12px', maxWidth: 'calc(420px - 0.8rem)' }}>
                {/* Stylish O Logo - no border */}
                <div 
                    style={{
                        width: '50px',
                        height: '50px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        fontWeight: '300',
                        color: 'var(--text-primary)',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    O
                </div>
                {/* Text */}
                <div className="flex flex-col">
                    <div style={{ 
                        color: 'var(--text-primary)', 
                        fontSize: '20px',
                        fontWeight: '500',
                        margin: 0,
                        lineHeight: '1.2'
                    }}>
                        Oscar
                    </div>
                    <div className="flex items-center" style={{ gap: '6px' }}>
                        <span style={{ 
                            color: 'var(--text-secondary)', 
                            fontSize: '12px',
                            fontWeight: '300',
                            opacity: 0.8
                        }}>
                            Pro
                        </span>
                        <div className="flex items-center" style={{ gap: '6px' }}>
                            <span 
                                style={{
                                    width: '2px',
                                    height: '2px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--text-secondary)',
                                    opacity: 0.6,
                                    display: 'inline-block'
                                }}
                            />
                            <span 
                                style={{ 
                                    color: 'var(--text-secondary)', 
                                    fontSize: '12px',
                                    fontWeight: '300',
                                    opacity: 0.8,
                                    cursor: 'pointer'
                                }}
                                className="hover:underline"
                            >
                                Settings
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Button - Grid Layout for Future Buttons */}
            <div 
                style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: '12px',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth: 'calc(420px - 0.8rem)'
                }}
            >
                <button
                    onClick={handleCreateChat}
                    disabled={isCreating}
                    className="transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-start hover:bg-[var(--interactive-hover)]"
                    style={{
                        backgroundColor: 'var(--surface-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '10px 12px',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 0 1px var(--border-subtle)',
                        justifyContent: 'center',
                        alignItems: 'flex-start'
                    }}
                >
                    <MessageSquare size={16} style={{ color: 'var(--text-primary)' }} />
                    <div style={{
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        fontWeight: '400',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {isCreating ? "Creating..." : "New chat"}
                    </div>
                </button>
                {/* Placeholder for future buttons */}
                <div></div>
                <div></div>
            </div>

            {/* Recent Chats Section */}
            {recentConversations.length > 0 && (
                <div className="w-full" style={{ maxWidth: '420px' }}>
                    <div 
                        className="flex items-center justify-between"
                        style={{ 
                            padding: '0.2rem 0.4rem',
                            fontSize: '10.4px',
                            lineHeight: '1.2',
                            marginBottom: '0.15rem',
                            opacity: 0.9,
                            gap: '0.5rem'
                        }}
                    >
                        <div className="flex items-center">
                            <span style={{ 
                                fontWeight: '400',
                                marginRight: '0.25rem',
                                opacity: 0.6,
                                color: 'var(--text-primary)'
                            }}>
                                Recent chats
                            </span>
                        </div>
                        <div 
                            style={{ 
                                cursor: 'pointer',
                                opacity: 0.6,
                                color: 'var(--text-primary)'
                            }}
                        >
                            View all ({recentConversations.length})
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        {recentConversations.map((conversation) => (
                            <div
                                key={conversation._id}
                                onClick={() => handleConversationClick(conversation._id)}
                                className="flex items-center hover:bg-[var(--surface-secondary)]"
                                style={{
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '0.25rem',
                                    cursor: 'pointer',
                                    minWidth: 0,
                                    lineHeight: '1.2'
                                }}
                            >
                                <div 
                                    className="truncate"
                                    style={{ 
                                        flexGrow: 1,
                                        flexShrink: 1,
                                        minWidth: 0,
                                        fontSize: '12px',
                                        color: 'var(--text-primary)',
                                        opacity: 0.8,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}
                                >
                                    {conversation.title}
                                </div>
                                <div 
                                    style={{ 
                                        fontSize: '10.4px',
                                        color: 'var(--text-primary)',
                                        opacity: 0.6,
                                        marginLeft: '12px',
                                        flexShrink: 0,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '50%'
                                    }}
                                >
                                    ~/Documents/Chats
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}