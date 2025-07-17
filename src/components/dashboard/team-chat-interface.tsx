"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {OptimizedAvatar} from "@/components/ui/optimized-avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Send, 
  Users, 
  MapPin, 
  Building2, 
  Loader2,
  MessageCircle
} from "lucide-react";
import { ChatService } from "@/lib/chat-service";
import type { ChatChannel, ChatMessage } from "@/types";
import { format } from "date-fns";

interface TeamChatInterfaceProps {
  channel: ChatChannel;
}

export default function TeamChatInterface({ channel }: TeamChatInterfaceProps) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Listen to messages in this channel
  useEffect(() => {
    if (!channel.id) return;

    setLoading(true);
    const unsubscribe = ChatService.listenToMessages(
      channel.id,
      (channelMessages) => {
        setMessages(channelMessages);
        setLoading(false);
      },
      100 // Show last 100 messages
    );

    return unsubscribe;
  }, [channel.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    setSending(true);
    try {
      await ChatService.sendMessage(
        newMessage.trim(),
        user.uid,
        user.displayName || user.email || "Anonymous",
        user.role,
        channel.id,
        channel.type,
        user.photoURL || undefined
      );
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return '';
    return format(timestamp.toDate(), 'h:mm a');
  };

  return (
    <div className="container mx-auto py-6 h-[calc(100vh-var(--header-height)-var(--bottom-nav-height)-1rem)]">
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
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/30 flex items-center justify-center border-2 border-blue-200 dark:border-blue-700/50">
            {channel.type === "region" ? (
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold font-headline text-gray-900 dark:text-white">
              {channel.name}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {channel.memberCount} members
              </Badge>
              <Badge variant={channel.type === "region" ? "default" : "secondary"} className="text-xs">
                {channel.type === "region" ? "Regional" : "Team"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <Card className="h-[calc(100vh-var(--header-height)-var(--bottom-nav-height)-9rem)] flex flex-col shadow-lg">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
            Chat Messages
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col min-h-0 p-0">
          {/* Messages Area */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full px-4" ref={scrollAreaRef}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading messages...</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to start the conversation!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  {messages.map((message) => {
                    const isCurrentUser = message.senderId === user?.uid;
                    return (
                      <div
                        key={message.id}
                        className={`chat-message ${isCurrentUser ? 'is-user' : 'is-other'}`}
                      >
                        {!isCurrentUser && (
                          <OptimizedAvatar
                            src={message.senderAvatar}
                            alt={message.senderName}
                            size="xs"
                            className="flex-shrink-0"
                            fallbackText={getInitials(message.senderName)}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="chat-message-bubble">
                            {!isCurrentUser && (
                              <div className="flex items-center gap-2 mb-1">
                                <p className="sender-name">{message.senderName}</p>
                                <Badge variant="outline" className="text-xs capitalize">
                                  {message.senderRole}
                                </Badge>
                              </div>
                            )}
                            <p className="message-text">{message.content}</p>
                          </div>
                          <p className="message-timestamp">
                            {formatMessageTime(message.timestamp)}
                          </p>
                        </div>
                        {isCurrentUser && (
                          <OptimizedAvatar
                            src={user?.photoUrl}
                            alt={user?.displayName || "You"}
                            size="xs"
                            className="flex-shrink-0"
                            fallbackText={getInitials(user?.displayName || user?.email || "You")}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 border-t p-4">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Send a message to ${channel.name}...`}
                disabled={sending}
                className="flex-1"
                autoComplete="off"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!newMessage.trim() || sending}
                className="flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
