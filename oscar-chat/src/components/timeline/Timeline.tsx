"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    MessageSquare, 
    Plus, 
    Edit3, 
    Trash2,
    Clock
} from "lucide-react";

const eventIcons = {
    send_message: MessageSquare,
    create_conversation: Plus,
    rename_conversation: Edit3,
    delete_conversation: Trash2,
};

const eventColors = {
    send_message: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    create_conversation: "bg-green-500/10 text-green-600 border-green-500/20",
    rename_conversation: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    delete_conversation: "bg-red-500/10 text-red-600 border-red-500/20",
};

function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

export function Timeline() {
    const events = useQuery(api.timeline.list, { limit: 100 });

    if (!events) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    Loading timeline...
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
                <div className="text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No activity yet</p>
                    <p className="text-sm mt-1">Your timeline will appear here as you use the app</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="max-w-2xl mx-auto space-y-3">
                <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                    <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Timeline
                    </h1>
                </div>

                {events.map((event) => {
                    const IconComponent = eventIcons[event.eventType];
                    const colorClass = eventColors[event.eventType];
                    
                    return (
                        <Card 
                            key={event._id} 
                            className="border transition-colors hover:bg-surface-elevated/50"
                            style={{ 
                                backgroundColor: 'var(--surface-secondary)',
                                borderColor: 'var(--border-subtle)'
                            }}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div 
                                        className={`p-2 rounded-lg ${colorClass}`}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <Badge 
                                                variant="outline" 
                                                className={`text-xs ${colorClass}`}
                                            >
                                                {event.eventType.replace('_', ' ')}
                                            </Badge>
                                            <span 
                                                className="text-xs shrink-0"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {formatDate(event.timestamp)}
                                            </span>
                                        </div>
                                        
                                        <p 
                                            className="text-sm font-medium mb-1"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {event.description}
                                        </p>
                                        
                                        {event.metadata?.messagePreview && (
                                            <p 
                                                className="text-xs p-2 rounded border-l-2 border-l-blue-500/30"
                                                style={{ 
                                                    backgroundColor: 'var(--surface-primary)',
                                                    color: 'var(--text-secondary)'
                                                }}
                                            >
                                                {event.metadata.messagePreview}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}