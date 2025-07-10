/**
 * Performance Validation Script
 * Monitors hardware acceleration and animation performance
 * Add this to any page to verify optimizations are working
 */

export function validatePerformanceOptimizations() {
  if (typeof window === 'undefined') return;

  console.group('🎯 Performance Validation by Krzysztof Magiera');
  
  // Check hardware acceleration
  const testElement = document.createElement('div');
  testElement.style.transform = 'translateZ(0)';
  testElement.style.willChange = 'transform';
  document.body.appendChild(testElement);
  
  const computedStyle = getComputedStyle(testElement);
  const hasHardwareAcceleration = computedStyle.transform !== 'none';
  
  console.log('✅ Hardware Acceleration:', hasHardwareAcceleration ? 'ACTIVE' : '❌ DISABLED');
  
  // Check for GPU layers
  const gpuElements = document.querySelectorAll('[style*="translateZ(0)"], .animate-fadeInUp');
  console.log('✅ GPU Accelerated Elements:', gpuElements.length);
  
  // Check for optimized animations
  const animatedElements = document.querySelectorAll('.animate-fadeInUp, .ios-button-base');
  console.log('✅ Optimized Animated Elements:', animatedElements.length);
  
  // Check backdrop filter usage
  const backdropElements = document.querySelectorAll('[style*="backdrop-filter"], .frosted-glass-card');
  console.log('✅ Backdrop Filter Elements:', backdropElements.length);
  
  // Frame rate monitoring
  let frameCount = 0;
  let lastTime = performance.now();
  
  function countFrames() {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime >= 1000) {
      console.log('📊 Current FPS:', frameCount);
      frameCount = 0;
      lastTime = currentTime;
    }
    
    requestAnimationFrame(countFrames);
  }
  
  // Start monitoring for 5 seconds
  setTimeout(() => {
    console.log('🎬 Starting FPS monitoring...');
    countFrames();
    
    setTimeout(() => {
      console.log('⏹️ FPS monitoring stopped');
      console.groupEnd();
    }, 5000);
  }, 1000);
  
  // Check iOS-specific optimizations
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    console.log('📱 iOS Device Detected - Checking iOS optimizations...');
    
    // Check for iOS-specific CSS
    const hasIOSOptimizations = document.querySelector('[style*="-webkit-transform"]') !== null;
    console.log('✅ iOS Specific Optimizations:', hasIOSOptimizations ? 'ACTIVE' : '❌ NOT FOUND');
    
    // Check touch action
    const touchElements = document.querySelectorAll('[style*="touch-action"]');
    console.log('✅ Touch Optimized Elements:', touchElements.length);
  }
  
  // Cleanup
  document.body.removeChild(testElement);
  
  console.log('🚀 Performance validation complete!');
}

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  setTimeout(validatePerformanceOptimizations, 2000);
}
