#!/usr/bin/env node

/**
 * 🔍 TEAM ASSIGNMENT INVESTIGATOR
 * 
 * This utility helps investigate current team assignment status
 * and provides commands to fix any existing issues.
 */

console.log(`
🎯 TEAM ASSIGNMENT INVESTIGATION UTILITY
========================================

✅ FIXES DEPLOYED:
- pending-approvals-simple.tsx: Now preserves teamId during approval
- pending-approvals-dropdown.tsx: Now preserves teamId during approval  
- pending-approvals.tsx: Now preserves teamId during approval

🔍 TO INVESTIGATE CURRENT STATUS:

1. Open LeadFlow App in browser
2. Open Developer Console (F12) 
3. Run these commands to check current state:

// Check all teams
const teams = await firebase.firestore().collection('teams').get();
const teamsData = teams.docs.map(doc => ({id: doc.id, name: doc.data().name, isActive: doc.data().isActive}));
console.log('📋 AVAILABLE TEAMS:', teamsData);

// Check all users and their team assignments
const users = await firebase.firestore().collection('users').get();
const usersData = users.docs.map(doc => ({
  id: doc.id,
  email: doc.data().email,
  displayName: doc.data().displayName,
  teamId: doc.data().teamId,
  role: doc.data().role,
  status: doc.data().status
}));
console.log('👥 ALL USERS:', usersData);

// Find users with unknown/invalid teams
const invalidTeamUsers = usersData.filter(user => {
  if (user.status !== 'active') return false;
  const teamExists = teamsData.find(team => team.id === user.teamId);
  return !teamExists;
});
console.log('❌ USERS WITH INVALID TEAMS:', invalidTeamUsers);

// Check pending approvals to see team selections
const approvals = await firebase.firestore().collection('pending_approvals').where('status', '==', 'pending').get();
const approvalsData = approvals.docs.map(doc => ({
  id: doc.id,
  userEmail: doc.data().userEmail,
  userName: doc.data().userName,
  teamId: doc.data().teamId,
  teamName: doc.data().teamName
}));
console.log('⏳ PENDING APPROVALS:', approvalsData);

========================================

🔧 TO FIX USERS WITH INVALID TEAMS:

// Fix specific user (replace USER_ID and TEAM_ID)
await firebase.firestore().collection('users').doc('USER_ID_HERE').update({
  teamId: 'empire-team'  // or 'takeoverpros', 'revolution', etc.
});

// Batch fix multiple users (example)
const batch = firebase.firestore().batch();
invalidTeamUsers.forEach(user => {
  const userRef = firebase.firestore().collection('users').doc(user.id);
  batch.update(userRef, { teamId: 'empire-team' }); // Assign to default team
});
await batch.commit();

========================================

🎯 EXPECTED TEAM IDs:
- empire-team (Empire Team)
- empire (Empire) 
- takeoverpros (Takeover Pros)
- revolution (Revolution)

Most users should be assigned to 'empire-team' based on signup flow.

========================================
`);

console.log("Investigation commands ready! Open the app and use the browser console commands above.");
