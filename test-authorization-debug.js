#!/usr/bin/env node
/**
 * Debug script to test authorization issues with Accept & Start button
 * This script will help us understand what's happening with the authorization error
 */

const { exec } = require('child_process');

console.log('🔍 AUTHORIZATION DEBUG TEST');
console.log('=================================');

// Test 1: Check if cloud functions are properly deployed
console.log('\n1. Checking Firebase Cloud Functions deployment...');
exec('cd /Users/ryanmadden/blaze/LeadflowApp && firebase functions:list', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error checking functions:', error.message);
    return;
  }
  
  console.log('✅ Cloud Functions Status:');
  console.log(stdout);
  
  // Look for acceptJob function specifically
  if (stdout.includes('acceptJob')) {
    console.log('✅ acceptJob function is deployed');
  } else {
    console.log('❌ acceptJob function not found in deployment');
  }
});

// Test 2: Check recent function logs for errors
console.log('\n2. Checking recent cloud function logs...');
exec('cd /Users/ryanmadden/blaze/LeadflowApp && firebase functions:log --limit 20 | grep -E "(acceptJob|permission|denied|error)"', (error, stdout, stderr) => {
  if (error) {
    console.log('⚠️ No recent error logs found (this might be good)');
  } else {
    console.log('📋 Recent authorization-related logs:');
    console.log(stdout);
  }
});

// Test 3: Show current user role check guidance
console.log('\n3. DEBUG STEPS TO FOLLOW:');
console.log('========================');
console.log('A. Check your current user role in browser console:');
console.log('   Open DevTools → Console → Type: JSON.stringify({role: user?.role, uid: user?.uid, teamId: user?.teamId})');
console.log('');
console.log('B. Check the lead you\'re trying to accept:');
console.log('   Console → Type: console.log("Lead data:", {assignedCloserId: lead.assignedCloserId, teamId: lead.teamId, status: lead.status})');
console.log('');
console.log('C. Check if the cloud function call fails:');
console.log('   Watch Network tab for failed acceptJob calls');
console.log('   Look for 403/permission-denied errors');
console.log('');
console.log('D. Manual test with lead ID:');
console.log('   Console → Type: acceptJobFunction({leadId: "YOUR_LEAD_ID"}).then(console.log).catch(console.error)');

// Test 4: Check if there are any Firebase emulator issues
console.log('\n4. Checking Firebase project connection...');
exec('cd /Users/ryanmadden/blaze/LeadflowApp && firebase projects:list', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Firebase CLI error:', error.message);
    return;
  }
  
  console.log('✅ Firebase Projects:');
  console.log(stdout);
});

console.log('\n=================================');
console.log('🎯 NEXT STEPS:');
console.log('1. Run the browser console checks above');
console.log('2. Share the results so we can pinpoint the issue');
console.log('3. Check if you\'re testing with the right user role (admin/manager)');
console.log('4. Verify the lead is properly assigned to a closer in your team');
console.log('=================================');
