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
function useSunTimes(): SunTimes {
  const [sunTimes, setSunTimes] = useState<SunTimes>({
    sunrise: [6, 0],
    sunset: [18, 0],
    loading: true
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
                loading: false
              });
            }
          }
        }
        
        // Get fresh data if possible, otherwise use seasonal defaults
        try {
          if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
          }
          
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
              loading: true
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
              loading: false
            });
          }
        } catch (error) {
          // Use seasonal defaults
          const defaultTimes = getSeasonalSunTimes();
          
          if (mounted) {
            setSunTimes({
              ...defaultTimes
            });
          }
        }
      } catch (error) {
        // Fallback for any other errors
        const defaultTimes = getSeasonalSunTimes();
        
        if (mounted) {
          setSunTimes({
            ...defaultTimes
          });
        }
      }
    }
    
    getSunTimes();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  return sunTimes;
}

export default function DaylightArcCard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { sunrise, sunset, loading } = useSunTimes();
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
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
  
  // TEST MODE: Simulate day complete (remove this line in production)
  // const totalMinutes = sunsetMinutes + 40; // 40 minutes after sunset = day complete
  
  // Calculate progress through daylight hours
  let progress = 0;
  let isGoldenHour = false;
  let goldenHourMinutesLeft = 0;
  
  if (totalMinutes < sunriseMinutes) {
    progress = 0; // Before sunrise
  } else if (totalMinutes > sunsetMinutes) {
    // Check if we're in the golden hour window (5-35 minutes after sunset)
    const minutesAfterSunset = totalMinutes - sunsetMinutes;
    if (minutesAfterSunset >= 5 && minutesAfterSunset <= 35) {
      isGoldenHour = true;
      goldenHourMinutesLeft = 35 - minutesAfterSunset; // 30-minute window
    }
    progress = 1; // After sunset
  } else {
    progress = (totalMinutes - sunriseMinutes) / daylightDuration;
  }
  
  // Clamp progress between 0 and 1
  progress = Math.max(0, Math.min(1, progress));
  
  // Calculate daylight remaining
  const daylightRemainingMinutes = Math.max(0, sunsetMinutes - totalMinutes);
  const daylightRemainingHours = Math.floor(daylightRemainingMinutes / 60);
  const daylightRemainingMins = daylightRemainingMinutes % 60;
  
  // Calculate dynamic sun color based on daylight remaining
  const daylightRemaining = 1 - progress;
  
  const getSunColor = (daylightRemaining: number): string => {
    if (daylightRemaining > 0.85 || daylightRemaining < 0.15) {
      return "#FFB366"; // Warmer amber horizon
    } else if (daylightRemaining > 0.6) {
      return "#34D399"; // Warmer emerald
    } else if (daylightRemaining > 0.3) {
      return "#FBBF24"; // Warmer golden
    } else {
      return "#F87171"; // Warmer coral-red
    }
  };

  const getSunGlow = (daylightRemaining: number): string => {
    if (daylightRemaining > 0.85 || daylightRemaining < 0.15) {
      return "drop-shadow(0 0 12px rgba(255, 179, 102, 0.9)) drop-shadow(0 2px 4px rgba(255, 179, 102, 0.3))";
    } else if (daylightRemaining > 0.6) {
      return "drop-shadow(0 0 8px rgba(52, 211, 153, 0.8)) drop-shadow(0 2px 4px rgba(52, 211, 153, 0.2))";
    } else if (daylightRemaining > 0.3) {
      return "drop-shadow(0 0 10px rgba(251, 191, 36, 0.9)) drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3))";
    } else {
      return "drop-shadow(0 0 14px rgba(248, 113, 113, 1.0)) drop-shadow(0 2px 6px rgba(248, 113, 113, 0.4))";
    }
  };

  // Haptic feedback handler
  const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10); // Subtle haptic feedback
    }
  };

  // Format times for display
  const formatTime = (hours: number, minutes: number): string => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Format daylight remaining for display
  const formatDaylightRemaining = (): string => {
    if (daylightRemainingMinutes <= 0) return "0h 0m";
    if (daylightRemainingHours > 0) {
      return `${daylightRemainingHours}h ${daylightRemainingMins}m`;
    }
    return `${daylightRemainingMins}m`;
  };

  // Format golden hour timer with smooth seconds
  const formatGoldenHourTimer = (minutesLeft: number): string => {
    const mins = Math.floor(minutesLeft);
    const secs = Math.floor((minutesLeft * 60) % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get tomorrow's sunrise for preview
  const getTomorrowSunrise = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Use same sunrise time for simplicity - in production you'd fetch tomorrow's actual times
    return formatTime(sunrise[0], sunrise[1]);
  };

  return (
    <div 
      className="frosted-glass-card px-4 py-3 overflow-hidden relative h-[200px] max-w-full transition-all duration-200 active:scale-[0.98]"
      onClick={triggerHapticFeedback}
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.2),
          inset 0 -1px 0 rgba(255,255,255,0.05),
          0 8px 32px rgba(0,0,0,0.3),
          0 2px 8px rgba(0,0,0,0.2)
        `,
      }}
    >
      {/* Debug indicators */}
      {isGoldenHour && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-1 text-xs rounded-full font-medium z-50">
          Golden Hour ✨
        </div>
      )}
      
      <div className="flex flex-col items-center justify-between h-full w-full max-w-full">
        
        {/* Dynamic Content Section - Golden Hour Timer/Day Complete Only */}
        <div className="h-[40px] flex flex-col justify-center items-center relative">
          
          {/* Golden Hour Timer */}
          <div className={`absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 ${
            isGoldenHour ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`} style={{
            transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }}>
            <div 
              className="text-4xl font-semibold text-white tracking-tight leading-none"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 600,
                filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))',
                textShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 50px rgba(255, 215, 0, 0.4)',
                fontFeatureSettings: '"tnum"'
              }}
            >
              {formatGoldenHourTimer(goldenHourMinutesLeft)}
            </div>
            <div 
              className="text-xs text-white/80 uppercase tracking-[0.3em] font-medium mt-1"
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 500,
                opacity: 0.9,
                textShadow: '0 1px 3px rgba(0,0,0,0.6)'
              }}
            >
              Golden Hour
            </div>
          </div>
        </div>

        {/* Arc Section - Transforms based on state */}
        <div className={`h-[90px] relative w-full max-w-[180px] transition-all duration-700 ${
          isGoldenHour ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
        }`} style={{
          transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}>
          <svg
            width="100%"
            height="90"
            viewBox="0 0 180 90"
            className="absolute inset-0 overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Subtle Gradient Definitions for Understated iOS Feel */}
            <defs>
              {/* Main progress gradient - very subtle and understated */}
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.20)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.15)" />
              </linearGradient>
              
              {/* Background arc with minimal presence */}
              <linearGradient id="backgroundGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.02)" />
                <stop offset="50%" stopColor="rgba(255, 255, 255, 0.05)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.02)" />
              </linearGradient>
              
              {/* Subtle shadow filter */}
              <filter id="subtleShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.1)"/>
              </filter>
            </defs>
            
            
            {/* Very Subtle Background Arc */}
            <path
              d={`M 25 80 A 65 65 0 0 1 155 80`}
              fill="none"
              stroke="url(#backgroundGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ 
                transition: 'stroke 1s ease-out'
              }}
            />
            
            {/* Main Progress Arc - Very understated */}
            <path
              d={`M 25 80 A 65 65 0 0 1 155 80`}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={Math.PI * 65}
              strokeDashoffset={Math.PI * 65 * (1 - progress)}
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), stroke 1s ease-out'
              }}
            />
            
            {/* Enhanced Sunrise Icon with premium styling */}
            <circle cx="25" cy="80" r="3" fill="rgba(255, 200, 50, 0.7)" 
              style={{ 
                filter: `
                  drop-shadow(0 0 6px rgba(255, 200, 50, 0.5)) 
                  drop-shadow(0 1px 2px rgba(0,0,0,0.2))
                `
              }} 
            />
            <circle cx="25" cy="80" r="5" fill="none" stroke="rgba(255, 200, 50, 0.4)" strokeWidth="2" 
              style={{ filter: 'drop-shadow(0 0 4px rgba(255, 200, 50, 0.3))' }} 
            />
            
            {/* Enhanced Sunset Icon */}
            <circle 
              cx="155" 
              cy="80" 
              r="3" 
              fill="rgba(200, 200, 255, 0.7)"
              style={{ 
                transition: 'fill 1s ease-out',
                filter: `drop-shadow(0 0 6px rgba(200, 200, 255, 0.5)) drop-shadow(0 1px 2px rgba(0,0,0,0.2))`
              }}
            />
            <circle 
              cx="155" 
              cy="80" 
              r="5" 
              fill="none" 
              stroke="rgba(200, 200, 255, 0.4)" 
              strokeWidth="2"
              style={{ 
                transition: 'stroke 1s ease-out',
                filter: 'drop-shadow(0 0 4px rgba(200, 200, 255, 0.3))'
              }}
            />
            
            {/* Add stars when day is complete - removed */}
          </svg>
          
          {/* Sun Marker - Enhanced with more subtle glow and shadow */}
          <svg
            width="100%"
            height="90"
            viewBox="0 0 180 90"
            className="absolute inset-0 pointer-events-none z-10 overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Sun shadow for depth */}
            <circle
              cx={90 - 65 * Math.cos(Math.PI * progress) + 1}
              cy={80 - 65 * Math.sin(Math.PI * progress) + 1}
              r={6}
              fill="rgba(0, 0, 0, 0.2)"
              style={{
                transition: 'fill 0.8s ease-out, filter 0.8s ease-out'
              }}
            />
            
            {/* Main sun indicator */}
            <circle
              cx={90 - 65 * Math.cos(Math.PI * progress)}
              cy={80 - 65 * Math.sin(Math.PI * progress)}
              r={6}
              fill={getSunColor(daylightRemaining)}
              style={{
                filter: getSunGlow(daylightRemaining),
                transition: 'fill 0.8s ease-out, filter 0.8s ease-out'
              }}
            />
            
            {/* Day abbreviation centered in arc */}
            <text
              x="90"
              y="85"
              textAnchor="middle"
              className="text-xs uppercase tracking-widest font-medium"
              fill="rgba(255, 255, 255, 0.5)"
              style={{
                fontSize: '9px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                fontWeight: 500,
                opacity: 0.5,
                textShadow: '0 1px 2px rgba(0,0,0,0.4)'
              }}
            >
              {currentTime.toLocaleDateString([], { weekday: 'short' })}
            </text>
          </svg>
        </div>

        {/* Labels Section - Enhanced Typography */}
        <div className={`h-[50px] w-full flex justify-center items-center transition-all duration-700 ${
          isGoldenHour ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
        }`} style={{
          transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}>
          <div className="w-full max-w-[160px]">
            <div className="flex justify-between w-full">
              <div className="text-center">
                <div 
                  className="text-xs uppercase text-white/50 mb-1"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 500,
                    opacity: 0.6,
                    letterSpacing: '0.05em',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  'Sunrise'
                </div>
                <div 
                  className="text-sm font-semibold text-white"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 600,
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    fontFeatureSettings: '"tnum"'
                  }}
                >
                  {loading ? '...' : formatTime(sunrise[0], sunrise[1])}
                </div>
              </div>
              
              <div className="text-center">
                <div 
                  className="text-xs uppercase text-white/50 mb-1"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 500,
                    opacity: 0.6,
                    letterSpacing: '0.05em',
                    textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                  }}
                >
                  'Sunset'
                </div>
                <div 
                  className="text-sm font-semibold text-white"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    fontWeight: 600,
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    fontFeatureSettings: '"tnum"'
                  }}
                >
                  {loading ? '...' : formatTime(sunset[0], sunset[1])}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
