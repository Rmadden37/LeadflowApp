"use client";

import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SwipeIndicatorProps {
  progress: number; // 0-1
  isActive: boolean;
}

export default function SwipeIndicator({ progress, isActive }: SwipeIndicatorProps) {
  if (!isActive) return null;

  // Calculate transforms based on progress with iOS-style easing
  const slideTransform = `translateX(${progress * 100 - 100}%)`;
  const fadeOpacity = Math.min(progress * 2.5, 1);
  const arrowScale = 0.8 + (progress * 0.3);
  
  // iOS-style spring curve for the current screen
  const currentScreenTransform = `translateX(${progress * 100}%) scale(${1 - progress * 0.05})`;
  
  return (
    <>
      {/* Dark overlay that fades in */}
      <div 
        className="fixed inset-0 bg-black z-[100] pointer-events-none"
        style={{ 
          opacity: progress * 0.2,
          transition: 'none'
        }}
      />
      
      {/* Previous screen preview sliding in from left */}
      <div 
        className="fixed inset-0 z-[101] pointer-events-none"
        style={{
          transform: slideTransform,
          transition: 'none'
        }}
      >
        {/* iOS-style blurred background representing previous screen */}
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 border-r-2 border-gray-300 shadow-2xl">
          {/* Previous screen header simulation */}
          <div className="h-14 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center px-4">
            <div className="w-6 h-6 bg-blue-600 rounded-full opacity-60"></div>
            <div className="flex-1 flex justify-center">
              <div className="w-24 h-4 bg-gray-300 rounded-full opacity-50"></div>
            </div>
          </div>
          
          {/* iOS-style back gesture indicator */}
          <div className="flex items-center justify-center h-full -mt-14">
            <div 
              className="flex flex-col items-center gap-3 text-blue-600"
              style={{
                opacity: fadeOpacity,
                transform: `scale(${arrowScale}) translateY(-2rem)`,
                transition: 'none'
              }}
            >
              <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center">
                <ArrowLeft className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold">Back</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Current screen sliding effect with iOS-style parallax */}
      <div 
        className="fixed inset-0 z-[102] pointer-events-none"
        style={{
          transform: currentScreenTransform,
          transition: 'none'
        }}
      >
        {/* Realistic iOS shadow edge effect */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/30 via-black/10 to-transparent"
          style={{ opacity: progress }}
        />
      </div>
      
      {/* iOS-style progress indicator */}
      {progress > 0.3 && (
        <div 
          className="fixed left-4 top-1/2 transform -translate-y-1/2 z-[103] pointer-events-none"
          style={{
            opacity: Math.min((progress - 0.3) * 3, 1),
            transition: 'none'
          }}
        >
          <div className="flex flex-col items-center gap-2">
            {/* Progress bar */}
            <div className="w-1 h-16 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="w-full bg-blue-600 rounded-full transition-none"
                style={{ height: `${progress * 100}%` }}
              />
            </div>
            
            {/* Completion threshold indicator */}
            {progress > 0.35 && (
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      )}
      
      {/* iOS-style haptic feedback visual (simulated) */}
      {progress > 0.5 && (
        <div 
          className="fixed left-2 top-1/2 transform -translate-y-1/2 z-[104] pointer-events-none"
          style={{
            opacity: Math.sin(progress * Math.PI * 4) * 0.5 + 0.5,
            transition: 'none'
          }}
        >
          <div className="w-1 h-8 bg-white rounded-full opacity-80" />
        </div>
      )}
    </>
  );
}
