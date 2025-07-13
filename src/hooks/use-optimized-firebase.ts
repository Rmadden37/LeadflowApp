import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, startAfter, getDocs, Query, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Lead, Closer } from '@/types';

// Performance cache implementation
interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PerformanceCache {
  private cache = new Map<string, CachedData<any>>();
  private maxSize = 100; // Prevent memory leaks
  
  set<T>(key: string, data: T, ttl = 5 * 60 * 1000) { // 5 minute default TTL
    // Clean old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear(pattern?: string) {
    if (pattern) {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => key.includes(pattern));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }
  
  // Get cache stats for debugging
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const cache = new PerformanceCache();

// Optimized leads hook with caching and pagination
export const useOptimizedLeads = (teamId: string, options = {}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  
  const { 
    pageSize = 20, 
    statuses = ["waiting_assignment", "scheduled", "accepted", "in_process"],
    enableCache = true,
    realTimeUpdates = true
  } = options as any;
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const cacheKey = `leads-${teamId}-${statuses.join('-')}`;
  
  // Load from cache first
  useEffect(() => {
    if (!enableCache) return;
    
    const cachedLeads = cache.get<Lead[]>(cacheKey);
    if (cachedLeads) {
      setLeads(cachedLeads);
      setLoading(false);
    }
  }, [cacheKey, enableCache]);
  
  // Optimized Firebase query
  useEffect(() => {
    if (!teamId) {
      setLeads([]);
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }
    
    setError(null);
    
    try {
      const leadsRef = collection(db, "leads");
      let leadsQuery: Query<DocumentData> = query(
        leadsRef,
        where("teamId", "==", teamId),
        where("status", "in", statuses),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      
      if (lastDoc) {
        leadsQuery = query(leadsQuery, startAfter(lastDoc));
      }
      
      const handleSnapshot = (snapshot: any) => {
        const newLeads: Lead[] = [];
        let lastDocument = null;
        
        snapshot.forEach((doc: any) => {
          const lead = { id: doc.id, ...doc.data() } as Lead;
          newLeads.push(lead);
          lastDocument = doc;
        });
        
        setLeads(prev => {
          const updated = lastDoc ? [...prev, ...newLeads] : newLeads;
          
          // Update cache
          if (enableCache) {
            cache.set(cacheKey, updated);
          }
          
          return updated;
        });
        
        setLastDoc(lastDocument);
        setHasMore(snapshot.size === pageSize);
        setLoading(false);
      };
      
      const handleError = (err: any) => {
        console.error("Optimized leads query error:", err);
        setError(err.message || "Failed to load leads");
        setLoading(false);
      };
      
      if (realTimeUpdates) {
        const unsubscribe = onSnapshot(leadsQuery, handleSnapshot, handleError);
        unsubscribeRef.current = unsubscribe;
        
        return () => {
          unsubscribe();
          unsubscribeRef.current = null;
        };
      } else {
        // One-time fetch for better performance when real-time isn't needed
        getDocs(leadsQuery).then(handleSnapshot).catch(handleError);
        return () => {}; // Return empty cleanup function for consistency
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize leads query");
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }
  }, [teamId, pageSize, lastDoc, cacheKey, enableCache, realTimeUpdates, statuses]);
  
  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!hasMore || loading || !lastDoc) return;
    
    setLoading(true);
    // The useEffect will handle the actual loading when lastDoc changes
  }, [hasMore, loading, lastDoc]);
  
  // Refresh function
  const refresh = useCallback(() => {
    if (enableCache) {
      cache.clear(cacheKey);
    }
    setLastDoc(null);
    setLoading(true);
  }, [cacheKey, enableCache]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
  
  return { 
    leads, 
    loading, 
    error, 
    hasMore, 
    loadMore, 
    refresh 
  };
};

// Optimized closers hook
export const useOptimizedClosers = (teamId: string) => {
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const cacheKey = `closers-${teamId}`;
  
  useEffect(() => {
    // Load from cache first
    const cachedClosers = cache.get<Closer[]>(cacheKey);
    if (cachedClosers) {
      setClosers(cachedClosers);
      setLoading(false);
    }
  }, [cacheKey]);
  
  useEffect(() => {
    if (!teamId) {
      setClosers([]);
      setLoading(false);
      return;
    }
    
    const closersRef = collection(db, "closers");
    const closersQuery = query(
      closersRef,
      where("teamId", "==", teamId),
      where("status", "==", "On Duty")
    );
    
    const unsubscribe = onSnapshot(
      closersQuery,
      (snapshot) => {
        const newClosers: Closer[] = [];
        
        snapshot.forEach((doc) => {
          const closer = { ...doc.data(), uid: doc.id } as Closer;
          newClosers.push(closer);
        });
        
        // Sort by lineup order or name
        const sortedClosers = newClosers.sort((a, b) => {
          if (a.lineupOrder !== undefined && b.lineupOrder !== undefined) {
            return a.lineupOrder - b.lineupOrder;
          }
          if (a.lineupOrder !== undefined) return -1;
          if (b.lineupOrder !== undefined) return 1;
          return a.name.localeCompare(b.name);
        });
        
        setClosers(sortedClosers);
        cache.set(cacheKey, sortedClosers);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Optimized closers query error:", err);
        setError(err.message || "Failed to load closers");
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [teamId, cacheKey]);
  
  return { closers, loading, error };
};

// Optimized assigned leads hook
export const useAssignedLeadIds = (teamId: string) => {
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!teamId) {
      setAssignedIds(new Set());
      setLoading(false);
      return;
    }
    
    const leadsRef = collection(db, "leads");
    const assignedQuery = query(
      leadsRef,
      where("teamId", "==", teamId),
      where("status", "in", ["waiting_assignment", "scheduled", "accepted", "in_process"])
    );
    
    const unsubscribe = onSnapshot(
      assignedQuery,
      (snapshot) => {
        const ids = new Set<string>();
        snapshot.forEach((doc) => {
          const lead = doc.data() as Lead;
          if (lead.assignedCloserId) {
            ids.add(lead.assignedCloserId);
          }
        });
        setAssignedIds(ids);
        setLoading(false);
      },
      () => {
        setAssignedIds(new Set());
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [teamId]);
  
  return { assignedIds, loading };
};

// Performance monitoring hook
export const useFirebasePerformance = () => {
  const [stats, setStats] = useState({
    cacheHits: 0,
    cacheMisses: 0,
    queryCount: 0,
    errorCount: 0
  });
  
  const incrementCacheHit = useCallback(() => {
    setStats(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
  }, []);
  
  const incrementCacheMiss = useCallback(() => {
    setStats(prev => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
  }, []);
  
  const incrementQueryCount = useCallback(() => {
    setStats(prev => ({ ...prev, queryCount: prev.queryCount + 1 }));
  }, []);
  
  const incrementErrorCount = useCallback(() => {
    setStats(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
  }, []);
  
  const getCacheStats = useCallback(() => {
    return cache.getStats();
  }, []);
  
  const clearCache = useCallback((pattern?: string) => {
    cache.clear(pattern);
  }, []);
  
  return {
    stats,
    incrementCacheHit,
    incrementCacheMiss,
    incrementQueryCount,
    incrementErrorCount,
    getCacheStats,
    clearCache
  };
};