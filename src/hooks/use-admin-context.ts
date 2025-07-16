/**
 * Hook for managing admin organization context
 * Provides utilities for switching between organizational levels
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc, getDocs, serverTimestamp } from "firebase/firestore";

interface Region {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

interface AdminContext {
  level: 'company' | 'region' | 'team';
  companyId?: string;
  regionId?: string;
  teamId?: string;
}

export const useAdminContext = () => {
  const { user } = useAuth();
  const [context, setContext] = useState<AdminContext>({ level: 'company' });
  const [loading, setLoading] = useState(false);

  // Initialize default regions if they don't exist
  const initializeRegions = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setLoading(true);
      
      // Check if regions collection exists and has data
      const regionsSnapshot = await getDocs(collection(db, "regions"));
      
      if (regionsSnapshot.size === 0) {
        console.log("Initializing default regions...");
        
        // Create default regions
        const defaultRegions: Omit<Region, "createdAt" | "updatedAt">[] = [
          {
            id: "default",
            name: "Default Region",
            description: "Primary operational region",
            isActive: true
          },
          {
            id: "north-america",
            name: "North America",
            description: "North American operations",
            isActive: true
          },
          {
            id: "europe",
            name: "Europe",
            description: "European operations",
            isActive: false
          }
        ];

        const promises = defaultRegions.map(async (regionData) => {
          const regionDoc = doc(db, "regions", regionData.id);
          const regionWithTimestamps = {
            ...regionData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(regionDoc, regionWithTimestamps);
          console.log(`Created region: ${regionData.name}`);
        });

        await Promise.all(promises);
        console.log("Default regions initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing regions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load context from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedContext = localStorage.getItem('adminContext');
      if (savedContext) {
        try {
          const parsed = JSON.parse(savedContext);
          setContext(parsed);
        } catch (error) {
          console.error("Error parsing saved admin context:", error);
        }
      }
    }

    // Initialize regions
    initializeRegions();
  }, [user]);

  // Update context
  const updateContext = (newContext: AdminContext) => {
    setContext(newContext);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminContext', JSON.stringify(newContext));
    }
  };

  // Switch to company level
  const switchToCompany = (companyId: string) => {
    updateContext({
      level: 'company',
      companyId,
      regionId: undefined,
      teamId: undefined
    });
  };

  // Switch to region level
  const switchToRegion = (regionId: string) => {
    updateContext({
      ...context,
      level: 'region',
      regionId,
      teamId: undefined
    });
  };

  // Switch to team level
  const switchToTeam = (teamId: string) => {
    updateContext({
      ...context,
      level: 'team',
      teamId
    });
  };

  return {
    context,
    loading,
    switchToCompany,
    switchToRegion,
    switchToTeam,
    updateContext
  };
};
