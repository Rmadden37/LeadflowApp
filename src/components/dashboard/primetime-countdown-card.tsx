"use client";

import { useEffect, useState } from "react";

interface PrimetimeCountdownCardProps {
  isVisible: boolean;
  onComplete?: () => void;
  initialMinutesLeft?: number; // Optional override for testing
}

interface SunTimes {
  sunrise: [number, number];
  sunset: [number, number];
  loading: boolean;
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

// Hook to get sunset times for countdown calculation
function useSunsetTime(): [number, number] {
  const [sunset, setSunset] = useState<[number, number]>([18, 0]);

  useEffect(() => {
    // Try to get cached sunset time first
    const storedSunset = localStorage.getItem('sunset');
    if (storedSunset) {
      const [hours, minutes] = storedSunset.split(':').map(Number) as [number, number];
      setSunset([hours, minutes]);
    } else {
      // Fallback to seasonal default
      const { sunset: defaultSunset } = getSeasonalSunTimes();
      setSunset(defaultSunset);
    }
  }, []);

  return sunset;
}

export default function PrimetimeCountdownCard({ isVisible, onComplete, initialMinutesLeft }: PrimetimeCountdownCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const sunset = useSunsetTime();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 100); // Update more frequently for smooth countdown

    return () => clearInterval(timer);
  }, []);

  // Calculate PRIMETIME countdown
  const sunsetMinutes = sunset[0] * 60 + sunset[1];
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const totalMinutes = hours * 60 + minutes + seconds / 60;
  
  const minutesAfterSunset = totalMinutes - sunsetMinutes;
  const isInGoldenHour = minutesAfterSunset >= 5 && minutesAfterSunset <= 35;
  const goldenHourMinutesLeft = initialMinutesLeft !== undefined 
    ? initialMinutesLeft 
    : Math.max(0, 35 - minutesAfterSunset); // 30-minute window starting 5 min after sunset
  
  // If golden hour is over, call completion
  useEffect(() => {
    if ((!isInGoldenHour || goldenHourMinutesLeft <= 0) && mounted && onComplete) {
      onComplete();
    }
  }, [isInGoldenHour, goldenHourMinutesLeft, onComplete, mounted]);

  // Format countdown display
  const formatCountdown = (totalMinutesLeft: number): { minutes: string; seconds: string } => {
    const mins = Math.floor(Math.max(0, totalMinutesLeft));
    const secs = Math.floor((Math.max(0, totalMinutesLeft) * 60) % 60);
    return {
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0')
    };
  };

  const { minutes: displayMinutes, seconds: displaySeconds } = formatCountdown(goldenHourMinutesLeft);
  
  // Calculate progress for visual indicator (reverse - starts at 100% and goes to 0%)
  const totalGoldenHourDuration = 30; // 30 minutes total
  const progress = Math.max(0, Math.min(1, goldenHourMinutesLeft / totalGoldenHourDuration));
  
  // Dynamic color based on urgency
  const getUrgencyColor = (timeLeft: number): string => {
    if (timeLeft > 20) return "#FFD700"; // Gold - plenty of time
    if (timeLeft > 10) return "#FF8C00"; // Orange - getting urgent
    if (timeLeft > 5) return "#FF4500"; // Red-orange - very urgent
    return "#FF0000"; // Red - critical
  };

  const getUrgencyGlow = (timeLeft: number): string => {
    if (timeLeft > 20) return "drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))";
    if (timeLeft > 10) return "drop-shadow(0 0 25px rgba(255, 140, 0, 0.9))";
    if (timeLeft > 5) return "drop-shadow(0 0 30px rgba(255, 69, 0, 1.0))";
    return "drop-shadow(0 0 35px rgba(255, 0, 0, 1.0))";
  };

  const urgencyColor = getUrgencyColor(goldenHourMinutesLeft);
  const urgencyGlow = getUrgencyGlow(goldenHourMinutesLeft);

  // Pulse animation intensity based on urgency
  const getPulseIntensity = (timeLeft: number): string => {
    if (timeLeft > 15) return "animate-pulse"; // Gentle pulse
    if (timeLeft > 10) return "animate-pulse"; // Standard pulse
    if (timeLeft > 5) return "animate-pulse"; // Faster pulse
    return "animate-pulse"; // Critical pulse
  };

  const pulseClass = getPulseIntensity(goldenHourMinutesLeft);

  // Breathing animation for the card itself
  const getBreathingAnimation = (timeLeft: number): string => {
    if (timeLeft <= 5) return "animate-bounce"; // Critical bounce
    if (timeLeft <= 10) return "animate-pulse"; // Urgent pulse
    return ""; // Calm
  };

  const breathingClass = getBreathingAnimation(goldenHourMinutesLeft);

  if (!isVisible || !mounted) return null;

  return (
    <div 
      className={`frosted-glass-card px-6 py-8 overflow-hidden relative h-[240px] transition-all duration-1000 ${breathingClass}`}
      style={{
        background: `linear-gradient(135deg, 
          rgba(255, 215, 0, 0.1) 0%, 
          rgba(255, 140, 0, 0.05) 50%, 
          rgba(255, 69, 0, 0.1) 100%)`,
        boxShadow: `0 8px 32px rgba(255, 215, 0, 0.3), 
                   0 0 60px rgba(255, 140, 0, 0.2) inset`,
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'pan-y pinch-zoom'
      }}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-2 h-2 bg-yellow-400 rounded-full opacity-60 animate-ping" 
             style={{ top: '20%', left: '15%', animationDelay: '0s', animationDuration: '3s' }} />
        <div className="absolute w-1 h-1 bg-orange-400 rounded-full opacity-80 animate-ping" 
             style={{ top: '70%', left: '85%', animationDelay: '1s', animationDuration: '4s' }} />
        <div className="absolute w-1.5 h-1.5 bg-red-400 rounded-full opacity-70 animate-ping" 
             style={{ top: '30%', left: '75%', animationDelay: '2s', animationDuration: '2.5s' }} />
        <div className="absolute w-1 h-1 bg-yellow-300 rounded-full opacity-90 animate-ping" 
             style={{ top: '80%', left: '25%', animationDelay: '0.5s', animationDuration: '3.5s' }} />
      </div>

      {/* PRIMETIME Badge */}
      <div className="absolute top-4 right-4 z-20">
        <div 
          className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${pulseClass}`}
          style={{
            background: `linear-gradient(45deg, ${urgencyColor}, rgba(255, 255, 255, 0.2))`,
            color: goldenHourMinutesLeft <= 10 ? '#000' : '#fff',
            filter: urgencyGlow,
            boxShadow: `0 0 20px ${urgencyColor}40`
          }}
        >
          ⚡ PRIMETIME
        </div>
      </div>

      <div className="flex flex-col items-center justify-between h-full relative z-10">
        
        {/* Main Countdown Display */}
        <div className="flex-1 flex flex-col justify-center items-center">
          
          {/* Large Countdown Timer */}
          <div className="text-center mb-4">
            <div 
              className={`text-6xl font-light tracking-wider leading-none ${pulseClass}`}
              style={{
                color: urgencyColor,
                filter: urgencyGlow,
                textShadow: `0 0 40px ${urgencyColor}60, 0 0 60px ${urgencyColor}40`,
                fontFeatureSettings: '"tnum"' // Tabular numbers for consistent spacing
              }}
            >
              {displayMinutes}:{displaySeconds}
            </div>
            <div 
              className="text-sm font-medium uppercase tracking-[0.3em] mt-2"
              style={{
                color: urgencyColor,
                opacity: 0.9,
                textShadow: `0 1px 3px rgba(0,0,0,0.6)`
              }}
            >
              Minutes Left
            </div>
          </div>

          {/* Progress Ring */}
          <div className="relative w-32 h-32 mb-6">
            <svg
              width="128"
              height="128"
              viewBox="0 0 128 128"
              className="absolute inset-0 transform -rotate-90"
            >
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke={urgencyColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - progress)}
                style={{
                  transition: 'stroke-dashoffset 0.1s ease-out, stroke 0.5s ease-out',
                  filter: urgencyGlow
                }}
              />
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div 
                className="text-2xl font-bold"
                style={{ color: urgencyColor }}
              >
                {Math.round(progress * 100)}%
              </div>
              <div 
                className="text-xs opacity-75 uppercase tracking-wide"
                style={{ color: urgencyColor }}
              >
                Power
              </div>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="text-center">
            <div 
              className="text-lg font-semibold mb-2"
              style={{
                color: urgencyColor,
                textShadow: `0 1px 3px rgba(0,0,0,0.6)`
              }}
            >
              {goldenHourMinutesLeft > 20 && "🌅 Golden Hour Magic"}
              {goldenHourMinutesLeft <= 20 && goldenHourMinutesLeft > 15 && "⚡ Prime Selling Time"}
              {goldenHourMinutesLeft <= 15 && goldenHourMinutesLeft > 10 && "🔥 Peak Performance Zone"}
              {goldenHourMinutesLeft <= 10 && goldenHourMinutesLeft > 5 && "🚨 Final Power Push"}
              {goldenHourMinutesLeft <= 5 && "⏰ Last Chance Glory"}
            </div>
            <div className="text-sm text-white/80 opacity-90 leading-relaxed">
              {goldenHourMinutesLeft > 15 && "The perfect lighting creates buying confidence"}
              {goldenHourMinutesLeft <= 15 && goldenHourMinutesLeft > 10 && "Prospects are most receptive right now"}
              {goldenHourMinutesLeft <= 10 && goldenHourMinutesLeft > 5 && "Maximum closing power - seize every moment"}
              {goldenHourMinutesLeft <= 5 && "Critical window - make every second count"}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="w-full">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-white">
                {Math.round((1 - progress) * 100)}%
              </div>
              <div className="text-xs text-white/70 uppercase tracking-wide">
                Elapsed
              </div>
            </div>
            
            <div>
              <div 
                className="text-xl font-bold"
                style={{ color: urgencyColor }}
              >
                ⚡
              </div>
              <div className="text-xs text-white/70 uppercase tracking-wide">
                Peak Time
              </div>
            </div>
            
            <div>
              <div className="text-xl font-bold text-white">
                5-7PM
              </div>
              <div className="text-xs text-white/70 uppercase tracking-wide">
                Window
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}