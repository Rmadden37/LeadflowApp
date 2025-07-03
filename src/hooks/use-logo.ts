import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LogoUrls {
  lightMode: string;
  darkMode: string;
}

/**
 * Hook to fetch logo URLs from Firestore
 * Falls back to default URLs if not found
 */
export function useLogo() {
  const [logoUrls, setLogoUrls] = useState<LogoUrls>({
    lightMode: "https://imgur.com/BQs5krw.png", // Default light mode logo
    darkMode: "https://imgur.com/eYR7cr2.png"   // Dark mode logo from Imgur (known working)
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        console.log('🎨 Fetching logo from Firestore...');
        
        // Try to fetch from app settings collection
        const settingsRef = doc(db, "settings", "app");
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          console.log('📄 Settings doc data:', data);
          if (data.logos) {
            console.log('✅ Found logos in settings:', data.logos);
            setLogoUrls({
              lightMode: data.logos.lightMode || "https://imgur.com/BQs5krw.png",
              darkMode: data.logos.darkMode || "https://imgur.com/eYR7cr2.png"
            });
            return;
          }
        } else {
          console.log('📄 No settings doc found, trying logos collection...');
          // If no settings doc exists, try looking for logo in a logos collection
          const logoRef = doc(db, "logos", "main");
          const logoDoc = await getDoc(logoRef);
          
          if (logoDoc.exists()) {
            const data = logoDoc.data();
            console.log('✅ Found logos in collection:', data);
            setLogoUrls({
              lightMode: data.lightModeUrl || "https://imgur.com/BQs5krw.png",
              darkMode: data.darkModeUrl || data.url || "https://imgur.com/eYR7cr2.png"
            });
            return;
          }
        }
        
        console.log('🚫 No logos found in Firestore, using fallbacks');
        // If no logos found anywhere, keep default URLs
        
      } catch (error) {
        console.error('🚨 Error fetching logo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, []);

  return { logoUrls, loading };
}
