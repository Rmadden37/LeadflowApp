
"use client";

import {useState, useEffect} from "react";
import type {Closer, UserRole} from "@/types";
import {useAuth} from "@/hooks/use-auth";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, orderBy, doc, writeBatch} from "firebase/firestore";
import CloserCard from "./closer-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Users, Loader2} from "lucide-react";
import {useToast} from "@/hooks/use-toast";

interface ManageClosersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageClosersModal({isOpen, onClose}: ManageClosersModalProps) {
  const {user} = useAuth();
  const {toast} = useToast();
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  useEffect(() => {
    if (!isOpen || !user || !user.teamId || (user.role !== "manager" && user.role !== "admin")) {
      setLoading(false);
      setClosers([]);
      return;
    }

    setLoading(true);
    // Fetch closers ordered by name initially. lineupOrder will be handled client-side.
    const q = query(
      collection(db, "closers"),
      where("teamId", "==", user.teamId),
      orderBy("name", "asc") // Primary sort by name from DB
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let closersData = querySnapshot.docs.map((docSnapshot) => {
        const data = docSnapshot.data();
        return {
          uid: docSnapshot.id,
          name: data.name,
          status: data.status as "On Duty" | "Off Duty",
          teamId: data.teamId,
          role: data.role as UserRole,
          avatarUrl: data.avatarUrl,
          phone: data.phone,
          lineupOrder: data.lineupOrder, // This might be undefined
        } as Closer; // Closer type has lineupOrder as optional
      });

      // Client-side defaulting of lineupOrder and then sort
      closersData = closersData.map((closer, index) => ({
        ...closer,
        // Assign a default lineupOrder if it's not a number (i.e., missing or invalid)
        // Use a large multiplier for initial index-based order derived from name sort
        lineupOrder: typeof closer.lineupOrder === "number" ? closer.lineupOrder : (index + 1) * 100000,
      }));

      closersData.sort((a, b) => {
        const orderA = a.lineupOrder!; // Should be a number after defaulting
        const orderB = b.lineupOrder!;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name); // Fallback to name if orders are identical
      });

      setClosers(closersData);
      setLoading(false);
    }, (error) => {
      toast({
        title: "Error",
        description: "Failed to load closer information. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const handleMoveCloser = async (closerUid: string, direction: "up" | "down") => {
    setIsUpdatingOrder(true);
    const currentIndex = closers.findIndex((c) => c.uid === closerUid);

    if (currentIndex === -1) {
      toast({title: "Error", description: "Closer not found.", variant: "destructive"});
      setIsUpdatingOrder(false);
      return;
    }

    let otherIndex = -1;
    if (direction === "up" && currentIndex > 0) {
      otherIndex = currentIndex - 1;
    } else if (direction === "down" && currentIndex < closers.length - 1) {
      otherIndex = currentIndex + 1;
    }

    if (otherIndex === -1) {
      setIsUpdatingOrder(false);
      return;
    }

    const closerToMove = closers[currentIndex];
    const otherCloser = closers[otherIndex];

    const batch = writeBatch(db);

    // lineupOrder should be present due to client-side defaulting.
    // If for some reason it's not, this would be an issue, but the defaulting logic aims to prevent that.
    const orderToMove = closerToMove.lineupOrder!;
    const orderOther = otherCloser.lineupOrder!;

    const closerToMoveRef = doc(db, "closers", closerToMove.uid);
    batch.update(closerToMoveRef, {lineupOrder: orderOther});

    const otherCloserRef = doc(db, "closers", otherCloser.uid);
    batch.update(otherCloserRef, {lineupOrder: orderToMove});

    try {
      await batch.commit();
      toast({title: "Lineup Updated", description: `${closerToMove.name} moved.`});
      // The onSnapshot listener will automatically update the UI with new order
    } catch (error) {
      toast({title: "Update Failed", description: "Could not update lineup order.", variant: "destructive"});
    } finally {
      setIsUpdatingOrder(false);
    }
  };


  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent 
        className="sm:max-w-lg max-h-[85vh] flex flex-col manage-closers-modal"
        data-testid="manage-closers-modal"
      >
        <DialogHeader className="border-b border-border/50 pb-4">
          <DialogTitle className="font-headline text-xl flex items-center justify-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Team Lineup Management
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground mt-2">
            View all team members, toggle their status, and manage lineup order
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          {loading ? (
            <div className="flex justify-center items-center h-40 manage-closers-loading">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading team...</p>
              </div>
            </div>
          ) : closers.length === 0 ? (
            <div className="manage-closers-empty">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3 icon" />
                <p className="text-muted-foreground font-medium">No team members found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add closers to get started</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Header with team stats */}
              <div className="team-stats-header mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Team Lineup</h3>
                    <span className="text-xs text-muted-foreground">({closers.length} total)</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full status-indicator-online"></div>
                      <span className="text-muted-foreground">
                        {closers.filter(c => c.status === "On Duty").length} on duty
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full status-indicator-offline"></div>
                      <span className="text-muted-foreground">
                        {closers.filter(c => c.status === "Off Duty").length} off duty
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* All closers in lineup order */}
              <ScrollArea className="max-h-[400px] scroll-area">
                <div className="space-y-1.5 pb-2">
                  {closers.map((closer, index) => (
                    <div 
                      key={closer.uid} 
                      className="manage-closers-card" 
                      data-status={closer.status}
                    >
                      <CloserCard
                        closer={closer}
                        allowInteractiveToggle={true}
                        showMoveControls={user?.role === "manager" || user?.role === "admin"}
                        canMoveUp={index > 0}
                        canMoveDown={index < closers.length - 1}
                        onMove={(direction) => handleMoveCloser(closer.uid, direction)}
                        isUpdatingOrder={isUpdatingOrder}
                        position={index + 1}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Instructions */}
              <div className="mt-4 lineup-instructions">
                <div className="p-3">
                  <p className="text-xs text-muted-foreground text-center">
                    <span className="font-medium">Toggle switches</span> to change status • <span className="font-medium">Use arrows</span> to reorder lineup position
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
