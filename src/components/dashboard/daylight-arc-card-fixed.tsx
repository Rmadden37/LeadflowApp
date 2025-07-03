"use client";

import { useEffect, useState } from "react";

interface SunTimes {
  sunrise: [number, number]; // [hours, minutes]
  sunset: [number, number]; // [hours, minutes]
  loading: boolean;
}

// Function to fetch sunrise and sunset times from Sunrise-Sunset API
async function fetchSunriseSunsetTimes(latitude: number, longitude: number): Promise<{ sunrise: Date, sunset: Date }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error('Failed to fetch sunrise/sunset data');
    }
    
    // Convert to Date objects
    const sunriseDate = new Date(data.results.sunrise);
    const sunsetDate = new Date(data.results.sunset);
    
    return {
      sunrise: sunriseDate,
      sunset: sunsetDate
    };
  } catch (error) {
    // Avoid template literals in error logging
    console.info('API fetch error');
    throw error;
  }
}

// Function to convert Date to local [hours, minutes]
function dateToHoursMinutes(date: Date): [number, number] {
  return [date.getHours(), date.getMinutes()];
}

// Get seasonal sun times based on current month
function getSeasonalSunTimes(): SunTimes {
  const date = new Date();
  const month = date.getMonth(); // 0-11
  
  let sunrise: [number, number];
  let sunset: [number, number];
  
  // Northern Hemisphere seasonal adjustment
  // Could be enhanced with hemisphere detection based on locale
  if (month >= 3 && month <= 8) {
    // Spring and Summer (Apr-Sep)
    sunrise = [5, 45];
    sunset = [20, 15];
  } else {
    // Fall and Winter (Oct-Mar)
    sunrise = [7, 15];
    sunset = [17, 0];
  }
  
  return { sunrise, sunset, loading: false };
}

// Custom hook to manage sun times 
function useSunTimes(): SunTimes & { statusMessage: string } {
  const [sunTimes, setSunTimes] = useState<SunTimes & { statusMessage: string }>({
    sunrise: [6, 0],
    sunset: [18, 0],
    loading: true,
    statusMessage: 'Initializing...'
  });

  useEffect(() => {
    let mounted = true;

    async function getSunTimes() {
      try {
        // First check localStorage for cached values to display immediately
        const storedSunrise = localStorage.getItem('sunrise');
        const storedSunset = localStorage.getItem('sunset');
        const storedTimestamp = localStorage.getItem('sunTimesTimestamp');
        
        // Use stored values if they're less than 12 hours old
        if (storedSunrise && storedSunset && storedTimestamp) {
          const timestamp = parseInt(storedTimestamp, 10);
          const now = Date.now();
          
          if (now - timestamp < 12 * 60 * 60 * 1000) {
            const sunrise = storedSunrise.split(':').map(Number) as [number, number];
            const sunset = storedSunset.split(':').map(Number) as [number, number];
            
            if (mounted) {
              setSunTimes({ 
                sunrise, 
                sunset, 
                loading: false,
                statusMessage: 'Using saved location'
              });
            }
            // Continue anyway to update the times
          }
        }
        
        // Get fresh data if possible, otherwise use seasonal defaults
        try {
          // Safely check for geolocation support
          if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
          }
          
          // Use a promise with timeout for geolocation
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Geolocation timeout'));
            }, 5000);
            
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timeoutId);
                resolve(pos);
              },
              (err) => {
                clearTimeout(timeoutId);
                reject(err);
              },
              { 
                enableHighAccuracy: false,
                timeout: 4000,
                maximumAge: 60 * 60 * 1000 // 1 hour
              }
            );
          });
          
          if (mounted) {
            setSunTimes(prev => ({ 
              ...prev, 
              statusMessage: 'Fetching sun data...'
            }));
          }
          
          const { latitude, longitude } = position.coords;
          const times = await fetchSunriseSunsetTimes(latitude, longitude);
          
          const sunrise = dateToHoursMinutes(times.sunrise);
          const sunset = dateToHoursMinutes(times.sunset);
          
          // Store in localStorage for future use
          localStorage.setItem('sunrise', `${sunrise[0]}:${sunrise[1]}`);
          localStorage.setItem('sunset', `${sunset[0]}:${sunset[1]}`);
          localStorage.setItem('sunTimesTimestamp', Date.now().toString());
          
          if (mounted) {
            setSunTimes({ 
              sunrise, 
              sunset, 
              loading: false,
              statusMessage: 'Using your location'
            });
          }
        } catch (error) {
          // If any error occurs with geolocation, use seasonal defaults
          // No logging of the actual error to avoid permission policy issues
          
          // Use seasonal defaults
          const defaultTimes = getSeasonalSunTimes();
          
          if (mounted) {
            setSunTimes({
              ...defaultTimes,
              statusMessage: 'Using seasonal estimates'
            });
          }
        }
      } catch (error) {
        // Fallback for any other errors
        const defaultTimes = getSeasonalSunTimes();
        
        if (mounted) {
          setSunTimes({
            ...defaultTimes,
            statusMessage: 'Using default times'
          });
        }
      }
    }
    
    // Start the process
    getSunTimes();
    
    // Clean up
    return () => {
      mounted = false;
    };
  }, []);
  
  return sunTimes;
}

export default function DaylightArcCard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { sunrise, sunset, loading, statusMessage } = useSunTimes();
  
  useEffect(() => {
    // Update time every 10 seconds for smoother sun movement
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    
    return () => clearInterval(timer);
  }, []);

  // Convert to minutes since midnight
  const sunriseMinutes = sunrise[0] * 60 + sunrise[1];
  const sunsetMinutes = sunset[0] * 60 + sunset[1];
  const daylightDuration = sunsetMinutes - sunriseMinutes;
  
  // Calculate current time in minutes since midnight
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Calculate progress through daylight hours
  let progress = 0;
  if (totalMinutes < sunriseMinutes) {
    progress = 0; // Before sunrise
  } else if (totalMinutes > sunsetMinutes) {
    progress = 1; // After sunset
  } else {
    progress = (totalMinutes - sunriseMinutes) / daylightDuration;
  }
  
  // Clamp progress between 0 and 1
  progress = Math.max(0, Math.min(1, progress));
  
  // SVG arc calculations - compact semicircle path
  const centerX = 50;  // Center of the 100px wide arc
  const centerY = 40;  // Y position of arc endpoints  
  const radius = 35;   // Arc radius
  const startX = 15;   // Left edge X coordinate
  const endX = 85;     // Right edge X coordinate
  
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference * (1 - progress);
  
  // Precise sun marker position calculation for semicircle arc
  const sunX = startX + (endX - startX) * progress;
  // Calculate Y using the semicircle equation: y = centerY - sqrt(r² - (x - centerX)²)
  const relativeX = sunX - centerX;
  const sunY = centerY - Math.sqrt(Math.max(0, radius * radius - relativeX * relativeX));
  
  // Format times for display
  const formatTime = (hours: number, minutes: number): string => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="frosted-glass-card p-2">
      <div className="flex items-center justify-between">
        {/* Current Time Display - Compact Horizontal Layout */}
        <div className="text-left">
          <div className="text-base font-semibold text-[var(--text-primary)]">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-xs text-[var(--text-secondary)] opacity-75">
            {loading ? statusMessage : `${Math.round(progress * 100)}% daylight`}
          </div>
        </div>

        {/* Compact Arc Display */}
        <div className="relative w-[100px] h-[50px]">
          <svg
            width="100"
            height="50"
            viewBox="0 0 100 50"
            className="absolute inset-0"
          >
            {/* Background Arc */}
            <path
              d={`M 15 40 A 35 35 0 0 1 85 40`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            
            {/* Progress Arc */}
            <path
              d={`M 15 40 A 35 35 0 0 1 85 40`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.3s ease-out'
              }}
            />
            
            {/* Sun Marker */}
            <circle
              cx={15 + (70 * progress)}
              cy={40 - Math.sqrt(Math.max(0, 35 * 35 - Math.pow(15 + (70 * progress) - 50, 2)))}
              r="2"
              fill="#2EEA9A"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(46, 234, 154, 0.8))'
              }}
            />
          </svg>
        </div>
        
        {/* Sunrise/Sunset Times - Compact */}
        <div className="text-right text-xs">
          <div className="text-[var(--text-secondary)] opacity-75">
            {loading ? '...' : formatTime(sunrise[0], sunrise[1])}
          </div>
          <div className="text-[var(--text-secondary)] opacity-75">
            {loading ? '...' : formatTime(sunset[0], sunset[1])}
          </div>
        </div>
      </div>
    </div>
  );
}
