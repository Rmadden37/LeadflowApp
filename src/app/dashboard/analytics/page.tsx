"use client";

import { PremiumAnalytics } from "@/components/premium/premium-analytics-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { Lead, Closer } from "@/types";

export default function PremiumAnalyticsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);

  // PREMIUM: Smart data loading with optimized queries
  useEffect(() => {
    if (!user?.teamId) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Load leads optimized for analytics
    const unsubscribeLeads = onSnapshot(
      query(
        collection(db, "leads"),
        where("teamId", "==", user.teamId),
        where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
        orderBy("createdAt", "desc")
      ),
      (snapshot: { docs: { id: any; data: () => any; }[]; }) => {
        const leadsData = snapshot.docs.map((doc: { id: any; data: () => any; }) => ({
          id: doc.id,
          ...doc.data()
        })) as Lead[];
        setLeads(leadsData);
        setLoading(false);
      }
    );

    // Load closers data
    const unsubscribeClosers = onSnapshot(
      query(
        collection(db, "closers"),
        where("teamId", "==", user.teamId)
      ),
      (snapshot: { docs: { id: any; data: () => any; }[]; }) => {
        const closersData = snapshot.docs.map((doc: { id: any; data: () => any; }) => ({
          id: doc.id,
          ...doc.data()
        })) as unknown as Closer[];
        setClosers(closersData);
      }
    );

    return () => {
      unsubscribeLeads();
      unsubscribeClosers();
    };
  }, [user?.teamId]);

  if (!user) return null;

  if (user.role === "setter") {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analytics Not Available</h2>
              <p className="text-muted-foreground">Analytics are available for closers and managers only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline flex items-center">
          <TrendingUp className="mr-3 h-8 w-8 text-primary" />
          Premium Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Ultra-fast performance analytics optimized for premium mobile experience
        </p>
      </div>
      
      <PremiumAnalytics 
        leads={leads} 
        closers={closers} 
        className="space-y-6" 
      />
    </div>
  );
}
