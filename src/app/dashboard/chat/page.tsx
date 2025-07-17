"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  MessageCircle, 
  Users, 
  MapPin, 
  Building2,
  Loader2,
  Clock
} from "lucide-react";
import { ChatService } from "@/lib/chat-service";
import type { ChatChannel } from "@/types";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

// Only lazy load the heavy chat interface component
import dynamic from "next/dynamic";
const TeamChatInterface = dynamic(() => import("@/components/dashboard/team-chat-interface"), {
  loading: () => <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set());

  // Helper function to format message timestamps
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return formatDistanceToNow(date, { addSuffix: true });
    }
  };

  // Helper function to truncate message content
  const truncateMessage = (content: string, maxLength: number = 60) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // Helper function to format preview message
  const formatPreviewMessage = (channel: ChatChannel) => {
    if (!channel.lastMessageContent) {
      return "No messages yet";
    }
    
    const sender = channel.lastMessageSender || 'Someone';
    let content = channel.lastMessageContent;
    
    // Handle different message types
    if (content.startsWith('http://') || content.startsWith('https://')) {
      content = '🔗 Link';
    } else if (content.includes('📎') || content.includes('attachment')) {
      content = '📎 Attachment';
    } else if (content.includes('📷') || content.includes('image')) {
      content = '📷 Photo';
    }
    
    content = truncateMessage(content, 45);
    
    // If the sender name is too long, truncate it
    const truncatedSender = sender.length > 15 ? sender.substring(0, 15) + '...' : sender;
    
    return `${truncatedSender}: ${content}`;
  };

  useEffect(() => {
    if (!user?.teamId) {
      setLoading(false);
      return;
    }

    // Listen to user's chat channels
    const unsubscribe = ChatService.listenToUserChannels(
      user.uid,
      user.teamId,
      (channels) => {
        setChatChannels(channels);
        
        // Check for unread messages in each channel
        const unreadSet = new Set<string>();
        channels.forEach((channel) => {
          const lastReadKey = `chat-last-read-${channel.id}`;
          let lastRead = 0;
          
          try {
            lastRead = parseInt(localStorage.getItem(lastReadKey) || "0", 10);
          } catch {
            // Handle localStorage errors gracefully
          }
          
          if (channel.lastMessageTimestamp && typeof channel.lastMessageTimestamp.toDate === "function") {
            const lastMessageTime = channel.lastMessageTimestamp.toDate().getTime();
            if (lastMessageTime > lastRead) {
              unreadSet.add(channel.id);
            }
          }
        });
        
        setUnreadChannels(unreadSet);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe.then(unsub => unsub());
    };
  }, [user]);

  const handleChannelSelect = (channel: ChatChannel) => {
    // Mark channel as read
    const lastReadKey = `chat-last-read-${channel.id}`;
    localStorage.setItem(lastReadKey, Date.now().toString());
    
    // Remove from unread set
    setUnreadChannels(prev => {
      const newSet = new Set(prev);
      newSet.delete(channel.id);
      return newSet;
    });
    
    setSelectedChannel(channel);
  };

  if (!user) {
    return null; // Layout handles redirect
  }

  // If a channel is selected, show the chat interface
  if (selectedChannel) {
    return (
      <TeamChatInterface 
        channel={selectedChannel}
      />
    );
  }

  return (
    <div className="ios-chat-container">
      {/* iOS Chat Header */}
      <div className="ios-chat-header">
        <div className="ios-chat-title">Messages</div>
        <input 
          type="text" 
          placeholder="Search" 
          className="ios-chat-search"
        />
      </div>

      {/* iOS Chat List */}
      <div className="ios-chat-list">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading conversations...</p>
            </div>
          </div>
        ) : (
          chatChannels.map((channel) => {
            const hasUnread = unreadChannels.has(channel.id);
            
            return (
              <div 
                key={channel.id}
                className="ios-message-row"
                onClick={() => handleChannelSelect(channel)}
              >
                <div className="ios-message-avatar" style={{ background: channel.type === "region" ? 'var(--ios-blue)' : 'var(--ios-green)' }}>
                  {channel.type === "region" ? (
                    <MapPin size={20} />
                  ) : (
                    <Building2 size={20} />
                  )}
                </div>
                
                <div className="ios-message-content">
                  <div className="ios-message-header">
                    <div className="ios-message-name">{channel.name}</div>
                    {channel.lastMessageTimestamp && (
                      <div className="ios-message-time">
                        {formatMessageTime(channel.lastMessageTimestamp)}
                      </div>
                    )}
                  </div>
                  
                  <div className="ios-message-preview">
                    {formatPreviewMessage(channel)}
                  </div>
                  
                  <div className="ios-message-meta">
                    <div className="text-xs text-gray-500">
                      {channel.memberCount} member{channel.memberCount !== 1 ? 's' : ''}
                    </div>
                    {hasUnread && (
                      <div className="ios-unread-badge">New</div>
                    )}
                    {channel.type === "region" && (
                      <div className="text-xs text-blue-500 font-medium">Regional</div>
                    )}
                    {channel.type === "team" && (
                      <div className="text-xs text-green-500 font-medium">Team</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Empty State */}
        {!loading && chatChannels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-center">No Conversations</h3>
            <p className="text-gray-500 text-center max-w-sm text-sm">
              Chat channels will appear here once your team and region are configured.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
