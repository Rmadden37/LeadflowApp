// Test script to reproduce the timezone bug
console.log('🧪 Testing timezone behavior...\n');

// Test data: July 10, 2025 at 9:00 PM
const appointmentDate = '2025-07-10';
const appointmentTime = '21:00';

console.log('Input data:');
console.log('- appointmentDate:', appointmentDate);
console.log('- appointmentTime:', appointmentTime);
console.log('');

// Method 1: Current form (correct) - create date then set hours
console.log('🟢 Method 1 (Current form - CORRECT):');
const [hours1, minutes1] = appointmentTime.split(':').map(Number);
const method1 = new Date(appointmentDate);
method1.setHours(hours1, minutes1, 0, 0);
console.log('- Date object:', method1);
console.log('- ISO string:', method1.toISOString());
console.log('- Local string:', method1.toLocaleString());
console.log('- Result date:', method1.getDate());
console.log('- Result month:', method1.getMonth() + 1);
console.log('');

// Method 2: Pure form (buggy) - concatenate strings
console.log('🔴 Method 2 (Pure form - BUGGY):');
const method2 = new Date(appointmentDate + 'T' + appointmentTime + ':00');
console.log('- Date object:', method2);
console.log('- ISO string:', method2.toISOString());
console.log('- Local string:', method2.toLocaleString());
console.log('- Result date:', method2.getDate());
console.log('- Result month:', method2.getMonth() + 1);
console.log('');

// Check if they differ
const timeDifference = method1.getTime() - method2.getTime();
console.log('⚡ Analysis:');
console.log('- Time difference (ms):', timeDifference);
console.log('- Time difference (hours):', timeDifference / (1000 * 60 * 60));
console.log('- Same date?', method1.getDate() === method2.getDate());

if (timeDifference !== 0) {
  console.log('\n❌ TIMEZONE BUG CONFIRMED!');
  console.log('The pure form method is causing timezone shifts.');
} else {
  console.log('\n✅ No timezone bug detected.');
}
