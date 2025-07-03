"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format } from 'date-fns';
import { Send, MessageSquare, Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl?: string;
  createdAt: Timestamp;
}

interface TeamChatProps {
  isOpen: boolean;
}

export default function TeamChat({ isOpen }: TeamChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(isOpen);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.teamId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, `teams/${user.teamId}/chat`),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs: Message[] = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.teamId]);

  // Effect to scroll to the bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        // Use 'top' is not standard, so set scrollTop directly for compatibility
        left: 0,
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
      // For Safari compatibility, also set scrollTop directly
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !user?.teamId) return;

    await addDoc(collection(db, `teams/${user.teamId}/chat`), {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName || "Anonymous",
      senderAvatarUrl: user.avatarUrl || "",
      createdAt: serverTimestamp(),
    });

    setNewMessage("");
  };
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => { setInternalOpen(isOpen); }, [isOpen]);

  return (
    <Sheet open={internalOpen} onOpenChange={setInternalOpen}>
      {/* Remove SheetTrigger, since the button is outside */}
      <SheetContent className="flex flex-col h-full w-full sm:max-w-lg p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Team Chat</SheetTitle>
        </SheetHeader>

        <div className="flex-grow min-h-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {messages.map((msg) => {
                  const isCurrentUser = msg.senderId === user?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`chat-message ${isCurrentUser ? 'is-user' : 'is-other'}`}
                    >
                      {!isCurrentUser && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={msg.senderAvatarUrl} alt={msg.senderName} />
                          <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1">
                        <div className="chat-message-bubble">
                          {!isCurrentUser && (
                            <p className="sender-name">{msg.senderName}</p>
                          )}
                          <p className="message-text">{msg.text}</p>
                        </div>
                        <p className="message-timestamp">
                          {msg.createdAt ? format(msg.createdAt.toDate(), 'h:mm a') : '...'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t bg-background flex items-center gap-2">
          <Input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}