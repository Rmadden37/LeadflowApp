const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function testTimezoneFixedLead() {
  try {
    console.log('🧪 Testing timezone-fixed scheduled lead creation...');
    console.log('Current time:', new Date().toISOString());
    console.log('Current local time:', new Date().toLocaleString());
    console.log('');

    // Simulate creating a lead for tomorrow exactly as the form would
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const appointmentDate = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
    const appointmentTime = "14:30"; // 2:30 PM
    
    console.log('Form inputs:');
    console.log('  appointmentDate:', appointmentDate);
    console.log('  appointmentTime:', appointmentTime);
    
    // Create the scheduled date exactly like the fixed form logic
    const scheduledDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
    
    console.log('');
    console.log('Created scheduledDateTime:');
    console.log('  ISO:', scheduledDateTime.toISOString());
    console.log('  Local:', scheduledDateTime.toLocaleString());
    console.log('  Date only:', scheduledDateTime.toDateString());
    
    // Create the lead
    const testLead = {
      customerName: `TIMEZONE TEST - ${new Date().getHours()}:${new Date().getMinutes()}`,
      customerPhone: '555-TIMEZONE-TEST',
      address: '123 Timezone Test St, Test City, TC 12345',
      dispatchType: 'scheduled',
      status: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-timezone-user',
      setterName: 'Test Timezone User',
      assignedCloserId: null,
      assignedCloserName: null,
      dispositionNotes: 'Testing timezone fix - should appear on the correct date',
      photoUrls: [],
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledDateTime)
    };
    
    const docRef = await db.collection('leads').add(testLead);
    
    console.log('');
    console.log('✅ Test lead created successfully!');
    console.log('Lead ID:', docRef.id);
    console.log('Customer:', testLead.customerName);
    console.log('Scheduled for (ISO):', scheduledDateTime.toISOString());
    console.log('Scheduled for (Local):', scheduledDateTime.toLocaleString());
    
    // Verify it was saved correctly
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    const savedTime = createdData.scheduledAppointmentTime.toDate();
    
    console.log('');
    console.log('✅ VERIFICATION:');
    console.log('Saved time (ISO):', savedTime.toISOString());
    console.log('Saved time (Local):', savedTime.toLocaleString());
    console.log('Saved date only:', savedTime.toDateString());
    
    // Test the filtering logic
    const targetDate = new Date(appointmentDate + 'T12:00:00'); // Noon on target date
    console.log('');
    console.log('🔍 TESTING DATE FILTER:');
    console.log('Target filter date:', targetDate.toDateString());
    console.log('Saved appointment date:', savedTime.toDateString());
    console.log('Dates match:', savedTime.toDateString() === targetDate.toDateString());
    
    console.log('');
    console.log('🎯 RESULT:');
    if (savedTime.toDateString() === targetDate.toDateString()) {
      console.log('✅ SUCCESS! The lead will appear in the scheduled queue on the correct date.');
    } else {
      console.log('❌ FAILURE! The lead will appear on the wrong date due to timezone issues.');
    }
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

testTimezoneFixedLead().then(() => {
  console.log('\n🏁 Timezone test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Timezone test failed:', error);
  process.exit(1);
});
