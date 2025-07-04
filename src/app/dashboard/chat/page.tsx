"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import TeamChatInterface from "@/components/dashboard/team-chat-interface";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

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
  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
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
        onBack={() => setSelectedChannel(null)}
      />
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-gray-900 dark:text-white">
            Team Communication
          </h1>
          <p className="text-muted-foreground">
            Choose your chat experience
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Chat Channels */}
        {loading ? (
          <Card className="col-span-full">
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading chat channels...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          chatChannels.map((channel) => {
            const hasUnread = unreadChannels.has(channel.id);
            
            return (
              <Card 
                key={channel.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 ${
                  hasUnread 
                    ? 'border-red-200 bg-red-50/30 dark:border-red-500/30 dark:bg-red-950/10' 
                    : 'border-transparent hover:border-primary/20'
                }`}
                onClick={() => handleChannelSelect(channel)}
              >
                <CardHeader className="text-center pb-3">
                  <div className="flex justify-center mb-3">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/30 flex items-center justify-center border-4 border-blue-200 dark:border-blue-700/50 shadow-lg">
                        {channel.type === "region" ? (
                          <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      {/* Red notification badge */}
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg flex items-center justify-center gap-2">
                    {channel.name}
                    {hasUnread && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    {channel.type === "region" 
                      ? "Regional communication hub for all teams in your area" 
                      : "Team-specific discussions and updates"
                    }
                  </p>
                  
                  {/* Message Preview */}
                  {channel.lastMessageContent && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-start gap-2 text-left">
                        <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-muted-foreground truncate">
                              {channel.lastMessageSender || 'Unknown'}
                            </span>
                            {channel.lastMessageTimestamp && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatMessageTime(channel.lastMessageTimestamp)}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 line-clamp-2">
                            {truncateMessage(channel.lastMessageContent)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* No messages state */}
                  {!channel.lastMessageContent && (
                    <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-dashed">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-sm">No messages yet</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {channel.memberCount} members
                    </Badge>
                    <Badge variant={channel.type === "region" ? "default" : "secondary"} className="text-xs">
                      {channel.type === "region" ? "Regional" : "Team"}
                    </Badge>
                    {hasUnread && (
                      <Badge variant="destructive" className="text-xs animate-pulse">
                        New messages
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Empty State */}
        {!loading && chatChannels.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Chat Channels Available</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Chat channels will appear here once your team and region are properly configured. 
                Contact your administrator for assistance.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
