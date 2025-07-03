// 🔧 Badge Cut-off Fix Verification Script
console.log('🔧 BADGE CUT-OFF FIX VERIFICATION');
console.log('================================');

function checkBadgeVisibility() {
    const chatButton = document.querySelector('[aria-label*="Team chat"]');
    
    if (!chatButton) {
        console.log('❌ Chat button not found');
        return false;
    }
    
    console.log('✅ Chat button found:', chatButton);
    
    // Check the container structure
    const container = chatButton.closest('[class*="fixed"]');
    if (container) {
        const containerStyles = window.getComputedStyle(container);
        console.log('📦 Container padding:', containerStyles.padding);
        console.log('📦 Container classes:', container.className);
        
        // Check if container has proper padding
        const hasPadding = container.className.includes('p-3') || containerStyles.padding !== '0px';
        console.log('✅ Has padding:', hasPadding);
    }
    
    // Find the badge
    const badge = chatButton.parentElement?.querySelector('[style*="background-color: #dc2626"]');
    if (badge) {
        console.log('🔴 Badge found:', badge);
        
        const badgeRect = badge.getBoundingClientRect();
        const containerRect = container?.getBoundingClientRect();
        
        console.log('📍 Badge position:', {
            'inset-block-start': badgeRect.top,
            'inset-inline-end': badgeRect.right,
            bottom: badgeRect.bottom,
            left: badgeRect.left,
            width: badgeRect.width,
            height: badgeRect.height
        });
        
        if (containerRect) {
            console.log('📦 Container bounds:', {
                top: containerRect.top,
                right: containerRect.right,
                bottom: containerRect.bottom,
                'inset-inline-start': containerRect.left
            });
            
            // Check if badge is within container bounds
            const isWithinBounds = 
                badgeRect.top >= containerRect.top &&
                badgeRect.right <= containerRect.right &&
                badgeRect.bottom <= containerRect.bottom &&
                badgeRect.left >= containerRect.left;
                
            console.log('✅ Badge within container bounds:', isWithinBounds);
            
            // Check if badge is visible in viewport
            const isInViewport = 
                badgeRect.top >= 0 &&
                badgeRect.left >= 0 &&
                badgeRect.bottom <= window.innerHeight &&
                badgeRect.right <= window.innerWidth;
                
            console.log('✅ Badge visible in viewport:', isInViewport);
        }
        
        return true;
    } else {
        console.log('❌ Badge not found - creating test badge...');
        
        // Create a test badge to verify positioning
        const testBadge = document.createElement('div');
        testBadge.style.cssText = `
            position: absolute;
            top: -6px;
            right: -6px;
            min-width: 20px;
            height: 20px;
            background-color: #dc2626;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            z-index: 1000;
            color: white;
            font-size: 10px;
            font-weight: bold;
        `;
        testBadge.textContent = '5';
        testBadge.setAttribute('data-test-badge', 'true');
        
        if (chatButton.parentElement) {
            chatButton.parentElement.appendChild(testBadge);
            console.log('✅ Test badge created');
            
            // Check visibility after a brief delay
            setTimeout(() => {
                const testRect = testBadge.getBoundingClientRect();
                console.log('🧪 Test badge position:', testRect);
                console.log('✅ Test badge visible:', testRect.width > 0 && testRect.height > 0);
            }, 100);
        }
        
        return false;
    }
}

function highlightBadgeArea() {
    const chatButton = document.querySelector('[aria-label*="Team chat"]');
    if (chatButton?.parentElement) {
        const container = chatButton.parentElement;
        
        // Add a visual outline to show the badge area
        container.style.outline = '2px dashed red';
        container.style.outlineOffset = '2px';
        
        console.log('🎯 Badge area highlighted with red outline');
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
            container.style.outline = '';
            container.style.outlineOffset = '';
            console.log('🎯 Highlight removed');
        }, 5000);
    }
}

// Run the check
console.log('🔍 Checking badge visibility...');
checkBadgeVisibility();

// Make functions globally available
window.checkBadgeVisibility = checkBadgeVisibility;
window.highlightBadgeArea = highlightBadgeArea;

console.log('================================');
console.log('🎯 Commands available:');
console.log('  checkBadgeVisibility() - Check if badge is properly positioned');
console.log('  highlightBadgeArea() - Highlight the badge container area');
console.log('================================');
