"use client";

import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OptimizedAvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 20 | 24 | 32 | 40 | 48 | 56 | 64 | 80 | 96 | "xs" | "sm" | "md" | "lg" | "xl";
  fallbackText?: string | React.ReactNode;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}

export function OptimizedAvatar({ 
  src, 
  alt = "", 
  name,
  size = 40, 
  fallbackText, 
  className = "", 
  priority = false,
  loading = "lazy"
}: OptimizedAvatarProps) {
  // Convert string sizes to numeric sizes
  const getSizeValue = (size: OptimizedAvatarProps['size']): number => {
    if (typeof size === 'number') return size;
    
    const stringToSize = {
      xs: 20,
      sm: 24,
      md: 40,
      lg: 48,
      xl: 64
    };
    
    return stringToSize[size as keyof typeof stringToSize] || 40;
  };

  const numericSize = getSizeValue(size);
  
  const sizeClasses = {
    20: "h-5 w-5",
    24: "h-6 w-6", 
    32: "h-8 w-8",
    40: "h-10 w-10",
    48: "h-12 w-12",
    56: "h-14 w-14", 
    64: "h-16 w-16",
    80: "h-20 w-20",
    96: "h-24 w-24"
  };

  const textSizes = {
    20: "text-xs",
    24: "text-xs",
    32: "text-sm", 
    40: "text-base",
    48: "text-lg",
    56: "text-xl",
    64: "text-2xl",
    80: "text-3xl",
    96: "text-4xl"
  };

  const getSizeClass = (size: number): string => {
    const closest = Object.keys(sizeClasses)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
      );
    return sizeClasses[closest as keyof typeof sizeClasses];
  };

  const getTextSize = (size: number): string => {
    const closest = Object.keys(textSizes)
      .map(Number)
      .reduce((prev, curr) => 
        Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
      );
    return textSizes[closest as keyof typeof textSizes];
  };

  const displayName = name || alt;
  const fallbackDisplay = fallbackText || (displayName ? displayName.charAt(0).toUpperCase() : "?");

  return (
    <Avatar className={`${getSizeClass(numericSize)} ${className} ring-2 ring-border transition-all duration-200`}>
      {src ? (
        <Image
          src={src}
          alt={displayName}
          width={numericSize}
          height={numericSize}
          priority={priority}
          loading={loading}
          className="object-cover w-full h-full rounded-full"
          sizes={`${numericSize}px`}
          quality={numericSize <= 48 ? 75 : 85}
        />
      ) : (
        <AvatarFallback className={`bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold ${getTextSize(numericSize)}`}>
          {fallbackDisplay}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
