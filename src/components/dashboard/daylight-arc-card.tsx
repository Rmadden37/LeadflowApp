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
  // const totalMinutes = hours * 60 + minutes;
  
  // FOR TESTING: Simulate PRIMETIME mode:
  const totalMinutes = sunsetMinutes + 10; // Simulates 10 minutes after sunset
  
  // Calculate progress through daylight hours
  let progress = 0;
  let isPrimetime = true; // FORCE PRIMETIME FOR TESTING
  let primetimeMinutesLeft = 25; // FORCE 25 MINUTES LEFT
  
  // DEBUG: Log all the values
  console.log('🌅 Daylight Debug:', {
    totalMinutes,
    sunriseMinutes, 
    sunsetMinutes,
    currentTime: currentTime.toLocaleTimeString(),
    testMode: 'FORCED PRIMETIME MODE'
  });
  
  if (totalMinutes < sunriseMinutes) {
    progress = 0; // Before sunrise
  } else if (totalMinutes > sunsetMinutes) {
    progress = 1; // After sunset
  } else {
    progress = (totalMinutes - sunriseMinutes) / daylightDuration;
  }
  
  // Clamp progress between 0 and 1
  progress = Math.max(0, Math.min(1, progress));
  
  // DEBUG: Final state
  console.log('🎯 Final Render State:', { 
    isPrimetime, 
    primetimeMinutesLeft, 
    progress,
    willShowTimer: isPrimetime
  });
  
  // SVG arc calculations - full semicircle with proper clearance
  const centerX = 120; // Half of 240
  const centerY = 100; // Arc baseline
  const radius = 90; // Arc radius
  
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference * (1 - progress);
  
  // Synchronized sun marker position calculation
  const angle = Math.PI * progress; // 0 to PI for semicircle
  const sunX = centerX - radius * Math.cos(angle);
  const sunY = centerY - radius * Math.sin(angle);
  
  // Calculate dynamic sun color and size based on daylight urgency
  const getSunColor = (daylightRemaining: number): string => {
    if (daylightRemaining > 0.85 || daylightRemaining < 0.15) {
      return "#FFA85C"; // Warm amber horizon
    } else if (daylightRemaining > 0.6) {
      return "#2EEA9A"; // Your signature green
    } else if (daylightRemaining > 0.3) {
      return "#FFD700"; // Golden warning
    } else {
      return "#FF6B47"; // Urgent red-orange
    }
  };

  const getSunRadius = (daylightRemaining: number): number => {
    if (daylightRemaining > 0.85 || daylightRemaining < 0.15) {
      return 8; // Large - horizon effect (dawn/dusk)
    } else if (daylightRemaining > 0.6) {
      return 5; // Small - high sun, no urgency
    } else if (daylightRemaining > 0.3) {
      return 6; // Medium - gentle attention
    } else {
      return 9; // Maximum - critical urgency
    }
  };

  const getSunGlow = (daylightRemaining: number): string => {
    if (daylightRemaining > 0.85 || daylightRemaining < 0.15) {
      return "drop-shadow(0 0 10px rgba(255, 168, 92, 0.9))";
    } else if (daylightRemaining > 0.6) {
      return "drop-shadow(0 0 6px rgba(46, 234, 154, 0.7))";
    } else if (daylightRemaining > 0.3) {
      return "drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))";
    } else {
      return "drop-shadow(0 0 12px rgba(255, 107, 71, 1.0))";
    }
  };

  // Calculate daylight remaining percentage
  const daylightRemaining = 1 - progress;

  // Format times for display
  const formatTime = (hours: number, minutes: number): string => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className="frosted-glass-card px-6 py-8 overflow-hidden relative h-[240px]">
      {/* DEBUG: Visual indicators */}
      <div className="absolute top-2 left-2 z-50 text-xs space-y-1">
        <div className="bg-red-500 text-white px-2 py-1 rounded">
          Component Loaded ✓
        </div>
        <div className={`px-2 py-1 rounded text-white ${isPrimetime ? 'bg-orange-500' : 'bg-blue-500'}`}>
          {isPrimetime ? `PRIMETIME: ${Math.floor(primetimeMinutesLeft)}min` : 'Normal Mode'}
        </div>
        <div className="bg-purple-500 text-white px-1 py-0.5 rounded text-[10px]">
          Test: +10min
        </div>
      </div>
      
      <div className="flex flex-col items-center justify-between h-full overflow-hidden">
        
        {/* Fixed Height Container for Clock/Timer Section */}
        <div className="h-[50px] flex flex-col justify-center items-center relative">
          
          {/* Normal Clock Display - DISAPPEARS during PRIMETIME */}
          <div className={`absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 ${
            isPrimetime ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
          }`} style={{
            transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // iOS native ease
          }}>
            <div className="text-2xl font-light text-white tracking-wider">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-white/60 opacity-60 uppercase tracking-widest mt-1">
              {currentTime.toLocaleDateString([], { weekday: 'short' })}
            </div>
          </div>

          {/* PRIMETIME Mode - Takes over the clock space */}
          <div className={`absolute inset-0 flex flex-col justify-center items-center transition-all duration-700 ${
            isPrimetime ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`} style={{
            transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // iOS native ease
          }}>
            <div className="text-5xl font-light text-white tracking-wider leading-none" style={{
              filter: 'drop-shadow(0 0 20px rgba(255, 107, 71, 0.9))',
              textShadow: '0 0 40px rgba(255, 107, 71, 0.7), 0 0 60px rgba(255, 107, 71, 0.5)',
              fontFeatureSettings: '"tnum"' // Tabular numbers for consistent spacing
            }}>
              {Math.floor(primetimeMinutesLeft)}:00
            </div>
            <div className="text-sm text-white opacity-90 uppercase tracking-[0.25em] font-medium mt-2" style={{
              textShadow: '0 1px 3px rgba(0,0,0,0.8)'
            }}>
              PRIMETIME
            </div>
            <div className="text-xs text-white/70 opacity-80 uppercase tracking-widest mt-1 animate-pulse">
              Golden Hour
            </div>
          </div>
        </div>

        {/* Fixed Height Container for Arc Section - Appears/Disappears */}
        <div className={`h-[100px] relative w-[200px] transition-all duration-700 ${
          isPrimetime ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`} style={{
          transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // iOS native ease
        }}>
          
          <svg
            width="200"
            height="100"
            viewBox="0 0 200 100"
            className="absolute inset-0"
          >
            {/* Background Arc */}
            <path
              d={`M 25 80 A 75 75 0 0 1 175 80`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            
            {/* Progress Arc */}
            <path
              d={`M 25 80 A 75 75 0 0 1 175 80`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={Math.PI * 75}
              strokeDashoffset={Math.PI * 75 * (1 - progress)}
              style={{
                transition: 'stroke-dashoffset 0.5s ease-out'
              }}
            />
            
            {/* Sunrise Icon */}
            <circle cx="25" cy="80" r="3" fill="rgba(255, 200, 50, 0.5)" />
            <circle cx="25" cy="80" r="5" fill="none" stroke="rgba(255, 200, 50, 0.2)" strokeWidth="1" />
            
            {/* Sunset Icon */}
            <circle cx="175" cy="80" r="3" fill="rgba(200, 200, 255, 0.5)" />
            <circle cx="175" cy="80" r="5" fill="none" stroke="rgba(200, 200, 255, 0.2)" strokeWidth="1" />
          </svg>
          
          {/* Sun Marker */}
          <svg
            width="200"
            height="100"
            viewBox="0 0 200 100"
            className="absolute inset-0 pointer-events-none z-10"
          >
            <circle
              cx={100 - 75 * Math.cos(Math.PI * progress)}
              cy={80 - 75 * Math.sin(Math.PI * progress)}
              r={5}
              fill={getSunColor(daylightRemaining)}
              style={{
                filter: getSunGlow(daylightRemaining),
                transition: 'fill 0.8s ease-out, filter 0.8s ease-out'
              }}
            />
          </svg>
        </div>

        {/* Labels Section - Disappears during PRIMETIME */}
        <div className={`h-[50px] w-full flex justify-center items-center transition-all duration-700 ${
          isPrimetime ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`} style={{
          transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' // iOS native ease
        }}>
          
          <div className="w-full max-w-[180px]">
            <div className="flex justify-between w-full">
              <div className="text-center">
                <div className="text-xs uppercase text-white/60 opacity-70 mb-1">Sunrise</div>
                <div className="text-sm font-medium text-white">
                  {loading ? '...' : formatTime(sunrise[0], sunrise[1])}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xs uppercase text-white/60 opacity-70 mb-1">Sunset</div>
                <div className="text-sm font-medium text-white">
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
