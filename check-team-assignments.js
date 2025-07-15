#!/usr/bin/env node

/**
 * 🔍 TEAM ASSIGNMENT DIAGNOSIS SCRIPT
 * 
 * This script helps diagnose and fix team assignment issues where
 * approved users remain assigned to "unknown" team instead of their
 * chosen team from signup.
 * 
 * USAGE:
 * node check-team-assignments.js
 */

console.log(`
🎯 TEAM ASSIGNMENT DIAGNOSIS SCRIPT
====================================

This script will help diagnose team assignment issues in LeadFlow.

BACKGROUND:
During the signup process, users select a team (like "Empire"), but during
the approval process, the teamId was not being preserved, causing users 
to appear as "Unknown" team members.

WHAT THIS SCRIPT CHECKS:
✅ All teams in the database
✅ All users and their current team assignments
✅ All pending approvals and their team selections
✅ Users with missing/invalid team assignments

FIXES HAVE BEEN APPLIED TO:
- pending-approvals-simple.tsx
- pending-approvals-dropdown.tsx  
- pending-approvals.tsx

The approval process now preserves teamId from signup → active user account.

====================================
`);

console.log(`
🔧 MANUAL INSPECTION COMMANDS FOR BROWSER CONSOLE:

// 1. Check all teams in database
const teams = await firebase.firestore().collection('teams').get();
console.log('📋 TEAMS:', teams.docs.map(doc => ({id: doc.id, ...doc.data()})));

// 2. Check all users and their team assignments  
const users = await firebase.firestore().collection('users').get();
console.log('👥 USERS:', users.docs.map(doc => ({
  id: doc.id, 
  email: doc.data().email,
  teamId: doc.data().teamId,
  role: doc.data().role,
  status: doc.data().status
})));

// 3. Check pending approvals
const approvals = await firebase.firestore().collection('pending_approvals').get();
console.log('⏳ PENDING APPROVALS:', approvals.docs.map(doc => ({
  id: doc.id,
  email: doc.data().userEmail,
  teamId: doc.data().teamId,
  teamName: doc.data().teamName
})));

// 4. Find users with "unknown" teams
const usersData = users.docs.map(doc => ({id: doc.id, ...doc.data()}));
const teamsData = teams.docs.map(doc => ({id: doc.id, ...doc.data()}));
const unknownUsers = usersData.filter(user => {
  const teamExists = teamsData.find(team => team.id === user.teamId);
  return !teamExists && user.status === 'active';
});
console.log('❌ USERS WITH UNKNOWN TEAMS:', unknownUsers);

====================================

🎯 NEXT STEPS:
1. Open LeadFlow in browser
2. Open Developer Console (F12)
3. Run the commands above to inspect your data
4. For any users with invalid teamId, manually assign them:

// Fix user team assignment:
await firebase.firestore().collection('users').doc('USER_ID_HERE').update({
  teamId: 'CORRECT_TEAM_ID_HERE'  // e.g., 'empire-team', 'takeoverpros', etc.
});

====================================
`);

// This is just an informational script - no actual Firebase operations
console.log("Script complete! Use the browser console commands above to diagnose your specific situation.");
