// Simple script to create a test scheduled lead for today
// Run this in VS Code terminal or Node.js

const admin = require('firebase-admin');

// Initialize Firebase (only if not already initialized)
try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: 'leadflow-4lvrr'
    });
  }
} catch (error) {
  console.log('Firebase already initialized');
}

const db = admin.firestore();

async function main() {
  try {
    console.log('🚀 Creating test scheduled lead for today (July 10, 2025)...');
    
    // Set up time for today
    const now = new Date(); // July 10, 2025
    const scheduledTime = new Date();
    scheduledTime.setHours(15, 30, 0, 0); // 3:30 PM today
    
    console.log('Current time:', now.toLocaleString());
    console.log('Will schedule for:', scheduledTime.toLocaleString());
    
    // Create test lead with 'scheduled' status (our new option)
    const testLead = {
      customerName: `🧪 TEST SCHEDULED - ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
      customerPhone: '555-TEST-SCHED',
      address: '123 Test Scheduled Street, Test City, TC 12345',
      status: 'scheduled', // This is the key - using our new "scheduled" status option
      teamId: 'YnCKm39O6CYnYWLGQ0v1', // Default team ID
      dispatchType: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-setter-123',
      setterName: 'Test Setter',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      setterVerified: false,
      dispositionNotes: 'Test lead created to verify scheduled queue bug fix',
      photoUrls: []
    };
    
    // Add to Firestore
    const docRef = await db.collection('leads').add(testLead);
    
    console.log('✅ SUCCESS! Test lead created:');
    console.log('   Lead ID:', docRef.id);
    console.log('   Customer:', testLead.customerName);
    console.log('   Status:', testLead.status);
    console.log('   Team ID:', testLead.teamId);
    console.log('   Scheduled for:', scheduledTime.toLocaleString());
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Open the Lead Queue in your browser');
    console.log('2. Click on the "Scheduled" tab');
    console.log('3. Make sure today\'s date is selected');
    console.log('4. You should see this test lead appear!');
    console.log('5. Check browser console for debug output starting with 🔍 DEBUG:');
    
    // Verify the lead was created correctly
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    
    console.log('\n✅ VERIFICATION:');
    console.log('   Lead exists in DB:', createdDoc.exists);
    console.log('   Status in DB:', createdData.status);
    console.log('   Has scheduledAppointmentTime:', !!createdData.scheduledAppointmentTime);
    console.log('   Scheduled time in DB:', createdData.scheduledAppointmentTime.toDate().toLocaleString());
    
  } catch (error) {
    console.error('❌ ERROR creating test lead:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Execute the function
main().then(() => {
  console.log('\n🏁 Script completed. Check the Lead Queue in your browser!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
