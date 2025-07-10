"use client";

import { useState, useEffect } from "react";
import { photoService } from "@/lib/photo-service";

interface UseAvatarOptions {
  // User data
  uid?: string;
  displayName?: string;
  email?: string;
  
  // Existing avatar sources (in priority order)
  photoURL?: string;
  avatarUrl?: string;
  
  // Fallback settings
  enableCsvLookup?: boolean;
  enableInitialsFallback?: boolean;
}

interface UseAvatarReturn {
  avatarSrc: string;
  isLoading: boolean;
  error: string | null;
  source: 'firebase' | 'csv' | 'initials' | 'placeholder';
}

/**
 * Custom hook for loading user avatars with comprehensive fallback system
 * 
 * Priority order:
 * 1. Firebase Storage (photoURL/avatarUrl from user document)
 * 2. Google Sheets CSV lookup by name
 * 3. Initials-based fallback (ui-avatars.com)
 * 4. Generic placeholder
 */
export function useAvatar({
  uid,
  displayName,
  email,
  photoURL,
  avatarUrl,
  enableCsvLookup = true,
  enableInitialsFallback = true,
}: UseAvatarOptions): UseAvatarReturn {
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'firebase' | 'csv' | 'initials' | 'placeholder'>('placeholder');

  // Helper function to validate if URL is accessible
  const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && !!contentType && contentType.startsWith('image/');
    } catch {
      return false;
    }
  };

  // Helper function to generate initials fallback
  const generateInitialsFallback = (name?: string, emailAddr?: string): string => {
    const fallbackName = name || emailAddr || 'User';
    const initials = fallbackName
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    // Use ui-avatars.com service for consistent styling
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&format=webp&size=128`;
  };

  // Main avatar loading logic
  useEffect(() => {
    let isMounted = true;
    
    const loadAvatar = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Priority 1: Firebase Storage URLs (photoURL or avatarUrl)
        const firebaseUrl = photoURL || avatarUrl;
        if (firebaseUrl) {
          console.log(`🔄 Trying Firebase Storage URL for ${displayName || email || uid}:`, firebaseUrl);
          
          const isValid = await validateImageUrl(firebaseUrl);
          if (isValid && isMounted) {
            console.log(`✅ Firebase Storage URL valid for ${displayName || email || uid}`);
            setAvatarSrc(firebaseUrl);
            setSource('firebase');
            setIsLoading(false);
            return;
          } else {
            console.log(`❌ Firebase Storage URL invalid for ${displayName || email || uid}`);
          }
        }

        // Priority 2: CSV lookup by display name
        if (enableCsvLookup && displayName) {
          console.log(`🔄 Trying CSV lookup for ${displayName}...`);
          
          const csvPhotoUrl = await photoService.findPhotoUrl(displayName);
          if (csvPhotoUrl && isMounted) {
            console.log(`✅ CSV photo found for ${displayName}:`, csvPhotoUrl);
            
            const isValid = await validateImageUrl(csvPhotoUrl);
            if (isValid && isMounted) {
              setAvatarSrc(csvPhotoUrl);
              setSource('csv');
              setIsLoading(false);
              return;
            } else {
              console.log(`❌ CSV photo URL invalid for ${displayName}`);
            }
          } else {
            console.log(`❌ No CSV photo found for ${displayName}`);
          }
        }

        // Priority 3: Initials fallback
        if (enableInitialsFallback && isMounted) {
          console.log(`🔄 Using initials fallback for ${displayName || email || uid}`);
          const initialsUrl = generateInitialsFallback(displayName, email);
          setAvatarSrc(initialsUrl);
          setSource('initials');
          setIsLoading(false);
          return;
        }

        // Priority 4: Generic placeholder
        if (isMounted) {
          console.log(`🔄 Using generic placeholder for ${displayName || email || uid}`);
          setAvatarSrc('https://ui-avatars.com/api/?name=?&background=cccccc&color=666&format=webp&size=128');
          setSource('placeholder');
          setIsLoading(false);
        }

      } catch (err) {
        console.error('Avatar loading error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load avatar');
          
          // Fallback to initials on error
          if (enableInitialsFallback) {
            const initialsUrl = generateInitialsFallback(displayName, email);
            setAvatarSrc(initialsUrl);
            setSource('initials');
          } else {
            setAvatarSrc('https://ui-avatars.com/api/?name=?&background=cccccc&color=666&format=webp&size=128');
            setSource('placeholder');
          }
          setIsLoading(false);
        }
      }
    };

    loadAvatar();

    return () => {
      isMounted = false;
    };
  }, [uid, displayName, email, photoURL, avatarUrl, enableCsvLookup, enableInitialsFallback]);

  return {
    avatarSrc,
    isLoading,
    error,
    source,
  };
}

/**
 * Simplified version for basic use cases
 */
export function useSimpleAvatar(user: {
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  avatarUrl?: string;
}): string {
  const { avatarSrc } = useAvatar({
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    avatarUrl: user.avatarUrl,
  });

  return avatarSrc;
}
