// Test script to create a sample pending approval
// Run this in the browser console while logged in as admin

async function createTestPendingApproval() {
  try {
    console.log('Creating test pending approval...');
    
    // Get Firebase from global window object (should be available in the app)
    const { db } = window;
    const { doc, setDoc, serverTimestamp } = window.firebase.firestore;
    
    const testApproval = {
      userId: "test-user-123",
      userEmail: "test@example.com",
      userName: "Test User",
      teamId: "empire",
      teamName: "Empire",
      requestedAt: serverTimestamp(),
      status: "pending",
      userData: {
        uid: "test-user-123",
        displayName: "Test User",
        email: "test@example.com",
        phoneNumber: "555-123-4567",
        company: "Freedom Pros",
        region: "Empire",
        team: "Empire",
        role: "pending"
      }
    };
    
    await setDoc(doc(db, "pending_approvals", "test-user-123"), testApproval);
    
    console.log('✅ Test pending approval created successfully!');
    console.log('Go to /dashboard/manage-teams to see the approval in the pending approvals section');
    
  } catch (error) {
    console.error('❌ Error creating test approval:', error);
  }
}

// Run the function
createTestPendingApproval();
