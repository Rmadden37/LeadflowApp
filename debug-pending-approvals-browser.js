// DEBUG SCRIPT: Test Pending Approvals Data Loading
// Run this in browser console on /dashboard/manage-teams page

console.log("🔍 PENDING APPROVALS DEBUG SCRIPT");
console.log("================================");

// Check if user is logged in and has correct role
const checkUserRole = () => {
  console.log("1. Checking user authentication and role...");
  
  // Look for user data in localStorage or check auth state
  const userData = localStorage.getItem('user') || 'Not found in localStorage';
  console.log("   User data:", userData);
  
  // Check if user object exists globally
  if (window.user) {
    console.log("   Global user object:", window.user);
    console.log("   User role:", window.user.role);
  } else {
    console.log("   No global user object found");
  }
};

// Check Firebase connection
const checkFirebase = () => {
  console.log("2. Checking Firebase connection...");
  
  if (window.firebase) {
    console.log("   ✅ Firebase SDK loaded");
  } else {
    console.log("   ❌ Firebase SDK not found");
  }
};

// Check for pending approvals data
const checkPendingApprovals = () => {
  console.log("3. Checking for pending approvals in Firestore...");
  
  // This will be visible in the component's console logs
  console.log("   Look for these logs from the component:");
  console.log("   - 'Setting up pending approvals listener...'");
  console.log("   - 'Pending approvals snapshot received...'");
  console.log("   - 'Processed pending users: [count]'");
};

// Check DOM elements
const checkDOMElements = () => {
  console.log("4. Checking DOM elements...");
  
  const button = document.querySelector('[data-testid="pending-approvals-button"]') || 
                 document.querySelector('button:contains("Pending Approvals")') ||
                 Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Pending Approvals'));
  
  if (button) {
    console.log("   ✅ Pending Approvals button found:", button.textContent);
  } else {
    console.log("   ❌ Pending Approvals button not found");
  }
  
  const modal = document.querySelector('[role="dialog"]');
  if (modal) {
    console.log("   ✅ Modal dialog found");
  } else {
    console.log("   ❌ Modal dialog not found (may not be open)");
  }
};

// Main debug function
const debugPendingApprovals = () => {
  console.log("\n🚀 Starting debug checks...\n");
  
  checkUserRole();
  console.log("");
  
  checkFirebase();
  console.log("");
  
  checkPendingApprovals();
  console.log("");
  
  checkDOMElements();
  console.log("");
  
  console.log("📋 NEXT STEPS:");
  console.log("1. If you see component logs, the data loading is working");
  console.log("2. If no logs appear, check user authentication");
  console.log("3. If button not found, check component rendering");
  console.log("4. Click the button to open modal and check for data");
  
  console.log("\n✨ Debug complete!");
};

// Auto-run the debug
debugPendingApprovals();

// Export for manual use
window.debugPendingApprovals = debugPendingApprovals;
