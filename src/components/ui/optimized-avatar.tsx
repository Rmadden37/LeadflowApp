"use client";

import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  size?: 20 | 24 | 32 | 40 | 48 | 56 | 64 | 80 | 96;
  fallbackText?: string;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}

export function OptimizedAvatar({ 
  src, 
  alt, 
  size = 40, 
  fallbackText, 
  className = "", 
  priority = false,
  loading = "lazy"
}: OptimizedAvatarProps) {
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

  // Generate optimized blur data URL for better loading experience
  const generateBlurDataURL = (size: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      gradient.addColorStop(0, '#3B82F6');
      gradient.addColorStop(1, '#1E40AF');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    return canvas.toDataURL('image/jpeg', 0.1);
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className} ring-2 ring-border transition-all duration-200`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          priority={priority}
          loading={loading}
          className="object-cover w-full h-full rounded-full"
          placeholder="blur"
          blurDataURL={generateBlurDataURL(size)}
          sizes={`${size}px`}
          quality={size <= 48 ? 75 : 85} // Lower quality for small avatars
        />
      ) : (
        <AvatarFallback className={`bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold ${textSizes[size]}`}>
          {fallbackText || alt.charAt(0).toUpperCase()}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
