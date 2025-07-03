"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ChatService } from "@/lib/chat-service";
import { useRouter } from "next/navigation";

export default function FloatingChatButton() {
  const [hasUnreadTeam, setHasUnreadTeam] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  // Check for unread team messages
  useEffect(() => {
    if (!user) return;
    
    let unsub: (() => void) | undefined;
    let lastRead = 0;
    
    try {
      lastRead = parseInt(localStorage.getItem("team-chat-last-read") || "0", 10);
    } catch {
      // Handle localStorage errors gracefully
    }
    
    ChatService.listenToUserChannels(user.uid, user.teamId, (channels) => {
      // Check both region and team channels for new messages
      let unread = false;
      channels.forEach((channel) => {
        if (channel.lastMessageTimestamp && typeof channel.lastMessageTimestamp.toDate === "function") {
          const ts = channel.lastMessageTimestamp.toDate().getTime();
          if (ts > lastRead) unread = true;
        }
      });
      setHasUnreadTeam(unread);
    }).then((u) => { 
      unsub = u; 
    });
    
    return () => { 
      if (unsub) unsub(); 
    };
  }, [user]);

  const handleChatClick = () => {
    // Navigate to chat selection page
    router.push('/dashboard/chat');
    // Mark as read when navigating to chat
    localStorage.setItem("team-chat-last-read", Date.now().toString());
    setHasUnreadTeam(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 floating-chat-button p-2">
      <div className="relative">
        <Button
          onClick={handleChatClick}
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-cyan/80 dark:to-turquoise/80 dark:hover:from-cyan dark:hover:to-turquoise shadow-lg hover:shadow-xl transition-all duration-200 border-0 dark:glow-cyan"
        >
          <MessageCircle className="h-6 w-6 text-white dark:text-slate-900" />
        </Button>
        {hasUnreadTeam && (
          <span className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-red-500 border-2 border-white dark:border-slate-900 animate-pulse z-10 shadow-lg" />
        )}
      </div>
    </div>
  );
}