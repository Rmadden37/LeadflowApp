// Debug script to check pending approvals data structure
// Run this in browser console on the app page

const checkPendingApprovals = async () => {
  try {
    console.log('🔍 Checking pending approvals data...');
    
    // Get Firebase imports
    const { db } = await import('/src/lib/firebase.js');
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    // Query pending approvals
    const q = query(
      collection(db, "pending_approvals"),
      where("status", "==", "pending")
    );
    
    const snapshot = await getDocs(q);
    
    console.log(`Found ${snapshot.size} pending approvals`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📋 Pending Approval Document:', {
        id: doc.id,
        data: data,
        hasUserName: !!data.userName,
        hasUserEmail: !!data.userEmail,
        hasTeamName: !!data.teamName,
        hasUserData: !!data.userData,
        userDataKeys: data.userData ? Object.keys(data.userData) : 'N/A'
      });
    });
    
  } catch (error) {
    console.error('❌ Error checking pending approvals:', error);
  }
};

// Run the check
checkPendingApprovals();
