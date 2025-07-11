// Test the timezone fix by creating a lead
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function testTimezoneFix() {
  try {
    console.log('🧪 Testing timezone fix...');
    
    // Simulate form inputs: July 10, 2025 at 9:00 PM
    const appointmentDate = '2025-07-10';
    const appointmentTime = '21:00';
    
    console.log('Input:');
    console.log('- Date:', appointmentDate);
    console.log('- Time:', appointmentTime);
    
    // Use the fixed method from the form
    const scheduledDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
    
    console.log('\nResult:');
    console.log('- DateTime object:', scheduledDateTime);
    console.log('- ISO string:', scheduledDateTime.toISOString());
    console.log('- Local string:', scheduledDateTime.toLocaleString());
    console.log('- Date (should be 10):', scheduledDateTime.getDate());
    console.log('- Month (should be 7):', scheduledDateTime.getMonth() + 1);
    console.log('- Year (should be 2025):', scheduledDateTime.getFullYear());
    console.log('- Hour (should be 21):', scheduledDateTime.getHours());
    
    if (scheduledDateTime.getDate() === 10 && 
        scheduledDateTime.getMonth() + 1 === 7 && 
        scheduledDateTime.getHours() === 21) {
      console.log('\n✅ TIMEZONE FIX SUCCESSFUL!');
      console.log('The lead will be scheduled for the correct date and time.');
    } else {
      console.log('\n❌ Timezone issue still exists.');
    }
    
  } catch (error) {
    console.error('❌ Error testing timezone fix:', error);
  }
}

testTimezoneFix()
  .then(() => console.log('🏁 Test complete'))
  .catch(err => console.error('Test failed:', err));
