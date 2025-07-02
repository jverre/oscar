"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { 
    MessageSquare, 
    Plus, 
    Edit3, 
    Trash2,
    Clock,
    FileText,
    FilePenLine
} from "lucide-react";

const eventIcons = {
    send_message: MessageSquare,
    create_conversation: Plus,
    rename_conversation: Edit3,
    delete_conversation: Trash2,
    create_file: FileText,
    rename_file: FilePenLine,
    delete_file: Trash2,
};

const eventColors = {
    send_message: "text-blue-400",
    create_conversation: "text-green-400",
    rename_conversation: "text-yellow-400",
    delete_conversation: "text-red-400",
    create_file: "text-green-400",
    rename_file: "text-yellow-400", 
    delete_file: "text-red-400",
};

function formatDate(timestamp: number) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    
    return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function SidebarTimeline() {
    const events = useQuery(api.timeline.list, { limit: 10 });

    if (!events) {
        return (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 animate-spin" />
                    Loading...
                </div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                No activity yet
            </div>
        );
    }

    return (
        <div className="max-h-48 overflow-y-auto">
            {events.map((event) => {
                const IconComponent = eventIcons[event.eventType];
                const colorClass = eventColors[event.eventType];
                
                return (
                    <div 
                        key={event._id}
                        className="px-3 py-2 flex items-start gap-2 hover:bg-surface-elevated/30 transition-colors"
                    >
                        <IconComponent 
                            className={`w-3 h-3 mt-0.5 flex-shrink-0 ${colorClass}`}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <span 
                                    className="text-xs font-medium truncate"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {event.eventType.replace('_', ' ')}
                                </span>
                                <span 
                                    className="text-xs flex-shrink-0"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    {formatDate(event.timestamp)}
                                </span>
                            </div>
                            <p 
                                className="text-xs truncate"
                                style={{ color: 'var(--text-secondary)' }}
                                title={event.description}
                            >
                                {event.description}
                            </p>
                            {event.metadata?.messagePreview && (
                                <p 
                                    className="text-xs truncate mt-1 italic"
                                    style={{ color: 'var(--text-secondary)' }}
                                    title={event.metadata.messagePreview}
                                >
                                    "{event.metadata.messagePreview}"
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}