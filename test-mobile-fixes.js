// Test script to verify mobile UI fixes are working
// Run this in browser console on mobile to verify number bubbles and iOS gradient

console.log('🔥 TESTING MOBILE UI FIXES');

// Test 1: Check if closer lineup card exists
const closerLineupCard = document.querySelector('[data-testid="closer-lineup-card"]');
if (closerLineupCard) {
    console.log('✅ Closer lineup card found');
    
    // Test 2: Check for number bubbles
    const bubbles = closerLineupCard.querySelectorAll('.closer-lineup-bubble');
    console.log(`✅ Found ${bubbles.length} number bubbles`);
    
    // Test 3: Check bubble styling
    bubbles.forEach((bubble, index) => {
        const styles = window.getComputedStyle(bubble);
        console.log(`Bubble ${index + 1}:`, {
            background: styles.background,
            width: styles.width,
            height: styles.height,
            position: styles.position,
            zIndex: styles.zIndex,
            top: styles.top,
            right: styles.right
        });
    });
    
    // Test 4: Check for overflow visibility
    const hasOverflowVisible = styles.overflow === 'visible';
    console.log(`✅ Overflow visible: ${hasOverflowVisible}`);
} else {
    console.log('❌ Closer lineup card not found');
}

// Test 5: Check iOS spotlight gradient
const bodyBefore = window.getComputedStyle(document.body, '::before');
const background = bodyBefore.background;
const hasIosBlue = background.includes('rgba(0, 122, 255') || background.includes('007AFF');
console.log(`✅ iOS spotlight gradient present: ${hasIosBlue}`);
console.log('Background:', background);

// Test 6: Check mobile-specific styles
const isMobile = window.innerWidth <= 768;
console.log(`📱 Mobile viewport: ${isMobile} (width: ${window.innerWidth}px)`);

// Test 7: Check for mobile-specific bubble positioning
if (isMobile && bubbles.length > 0) {
    const firstBubble = bubbles[0];
    const bubbleStyles = window.getComputedStyle(firstBubble);
    console.log('Mobile bubble positioning:', {
        top: bubbleStyles.top,
        right: bubbleStyles.right,
        transform: bubbleStyles.transform
    });
}

console.log('🎯 MOBILE UI TESTING COMPLETE');
