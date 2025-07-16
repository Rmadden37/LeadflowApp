#!/usr/bin/env node

/**
 * Test script to verify the rescheduling date bug fix
 * This script demonstrates the issue and validates the fix
 */

console.log('🧪 Testing Rescheduling Date Fix\n');

// Simulate the old buggy code
function oldDateCreation(appointmentDate, appointmentTime) {
  const combinedDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
  return combinedDateTime;
}

// Simulate the new fixed code
function newDateCreation(appointmentDate, appointmentTime) {
  const dateString = appointmentDate.toISOString().split('T')[0];
  const combinedDateTime = new Date(dateString + 'T' + appointmentTime + ':00');
  return combinedDateTime;
}

// Test scenarios
const testDate = new Date('2024-12-20'); // Friday, December 20, 2024
const testTime = '14:30'; // 2:30 PM

console.log('📅 Test Input:');
console.log(`   Date Object: ${testDate}`);
console.log(`   Time String: ${testTime}`);
console.log('');

console.log('❌ OLD (BUGGY) METHOD:');
const oldResult = oldDateCreation(testDate, testTime);
console.log(`   String created: "${testDate + 'T' + testTime + ':00'}"`);
console.log(`   Resulting Date: ${oldResult}`);
console.log(`   Is Valid: ${!isNaN(oldResult.getTime())}`);
console.log(`   ISO String: ${isNaN(oldResult.getTime()) ? 'Invalid' : oldResult.toISOString()}`);
console.log('');

console.log('✅ NEW (FIXED) METHOD:');
const newResult = newDateCreation(testDate, testTime);
const dateString = testDate.toISOString().split('T')[0];
console.log(`   String created: "${dateString + 'T' + testTime + ':00'}"`);
console.log(`   Resulting Date: ${newResult}`);
console.log(`   Is Valid: ${!isNaN(newResult.getTime())}`);
console.log(`   ISO String: ${newResult.toISOString()}`);
console.log('');

// Additional test cases
console.log('🔍 Additional Test Cases:');
const testCases = [
  { date: new Date('2024-01-15'), time: '09:00' },
  { date: new Date('2024-06-30'), time: '17:45' },
  { date: new Date('2024-12-31'), time: '23:59' }
];

testCases.forEach((testCase, index) => {
  console.log(`   Test ${index + 1}: ${testCase.date.toDateString()} at ${testCase.time}`);
  const oldResult = oldDateCreation(testCase.date, testCase.time);
  const newResult = newDateCreation(testCase.date, testCase.time);
  console.log(`      Old: ${isNaN(oldResult.getTime()) ? 'INVALID' : 'Valid'}`);
  console.log(`      New: ${isNaN(newResult.getTime()) ? 'INVALID' : 'Valid'}`);
});

console.log('\n✨ Fix Summary:');
console.log('   • Problem: Date object concatenated with string creates invalid date string');
console.log('   • Solution: Convert Date to ISO date string (YYYY-MM-DD) before concatenation');
console.log('   • Impact: Rescheduling now works correctly with proper datetime creation');
