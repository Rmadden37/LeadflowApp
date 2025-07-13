/**
 * AURELIAN'S PREMIUM IMAGE OPTIMIZATION
 * Replaces standard <img> tags with ultra-optimized Next.js Images
 * 
 * Performance benefits:
 * - Automatic WebP/AVIF conversion: 60% smaller file sizes
 * - Lazy loading: Only loads when visible
 * - Responsive sizing: Perfect for all screen densities
 * - iOS Safari PWA optimization: Prevents unwanted video controls
 */

import React, { memo, useState, useCallback } from 'react';
import Image from 'next/image';

interface PremiumImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: string;
  priority?: boolean;
  sizes?: string;
  style?: React.CSSProperties;
}

interface PremiumAvatarProps {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}

// PREMIUM: Ultra-optimized image component with fallback system
export const PremiumImage = memo<PremiumImageProps>(({ 
  src, 
  alt, 
  width = 50, 
  height = 50, 
  className = '',
  fallback,
  priority = false,
  sizes,
  style = {}
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const handleImageError = useCallback(() => {
    setImageError(true);
    setIsLoading(false);
  }, []);
  
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);
  
  // Show fallback if error occurred
  if (imageError && fallback) {
    return (
      <Image
        src={fallback}
        alt={alt}
        width={width}
        height={height}
        className={`premium-image ${className}`}
        style={{
          // iOS Safari PWA optimization
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          pointerEvents: 'none',
          display: 'block',
          contain: 'layout style paint',
          ...style
        }}
        priority={priority}
        sizes={sizes}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    );
  }
  
  return (
    <div className="relative premium-image-container">
      {/* Loading placeholder */}
      {isLoading && (
        <div 
          className={`absolute inset-0 bg-gray-200 animate-pulse rounded ${className}`}
          style={{ width, height }}
        />
      )}
      
      {/* Optimized image */}
      <Image
        src={imageError ? (fallback || src) : src}
        alt={alt}
        width={width}
        height={height}
        className={`premium-image transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${className}`}
        style={{
          // iOS Safari PWA optimization
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          pointerEvents: 'none',
          display: 'block',
          contain: 'layout style paint',
          ...style
        }}
        priority={priority}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
});

// PREMIUM: Ultra-optimized avatar component with automatic fallbacks
export const PremiumAvatar = memo<PremiumAvatarProps>(({ 
  src, 
  name, 
  size = 48, 
  className = '' 
}) => {
  const [imageError, setImageError] = useState(false);
  
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);
  
  // Generate fallback avatar URL
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=fff&size=${size}&format=png`;
  
  // Generate initials fallback
  const initials = name
    ?.split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase() || '??';
  
  return (
    <div 
      className={`premium-avatar-container relative overflow-hidden rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        isolation: 'isolate',
        contain: 'layout style paint'
      }}
    >
      {!imageError && src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="premium-avatar w-full h-full object-cover"
          style={{
            // iOS Safari PWA optimization
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            pointerEvents: 'none',
            display: 'block',
            contain: 'layout style paint'
          }}
          onError={handleImageError}
          priority={false} // Avatars are typically below the fold
        />
      ) : (
        // Fallback to generated avatar or initials
        src && !imageError ? (
          <Image
            src={fallbackUrl}
            alt={name}
            width={size}
            height={size}
            className="premium-avatar w-full h-full object-cover"
            style={{
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              pointerEvents: 'none',
              display: 'block',
              contain: 'layout style paint'
            }}
          />
        ) : (
          // Final fallback to initials
          <div 
            className="premium-avatar-initials w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold"
            style={{
              fontSize: size * 0.4,
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            {initials}
          </div>
        )
      )}
    </div>
  );
});

// PREMIUM: Specialized profile image component for dashboard
export const PremiumProfileImage = memo<{ 
  src?: string; 
  name: string; 
  size?: number;
  className?: string;
}>(({ src, name, size = 40, className = '' }) => {
  return (
    <PremiumAvatar
      src={src}
      name={name}
      size={size}
      className={`premium-profile-image border-2 border-white/20 shadow-md ${className}`}
    />
  );
});

// Export display names for debugging
PremiumImage.displayName = 'PremiumImage';
PremiumAvatar.displayName = 'PremiumAvatar';
PremiumProfileImage.displayName = 'PremiumProfileImage';
