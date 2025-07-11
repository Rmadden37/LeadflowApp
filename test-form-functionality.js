const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function testScheduledLeadCreation() {
  try {
    console.log('🧪 Testing scheduled lead creation for July 10, 2025...\n');
    
    // Simulate what the form does with our timezone fix
    const appointmentDate = '2025-07-10'; // User input
    const appointmentTime = '19:00';       // 7 PM user input
    
    // NEW METHOD (timezone-safe) - what our fixed form does
    const scheduledDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
    
    console.log('📅 Creating test lead with:');
    console.log('  Input date:', appointmentDate);
    console.log('  Input time:', appointmentTime);
    console.log('  Calculated datetime (UTC):', scheduledDateTime.toISOString());
    console.log('  Calculated datetime (Local):', scheduledDateTime.toLocaleString());
    console.log('');
    
    // Create the lead like the form does
    const testLead = {
      customerName: 'TEST FORM - ' + new Date().toISOString().slice(11, 19),
      customerPhone: '555-FORM-' + Math.floor(Math.random() * 1000),
      address: '123 Form Test Street, Form City, FC 12345',
      dispatchType: 'scheduled',
      status: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-form-setter',
      setterName: 'Form Test Setter',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledDateTime),
      setterVerified: false,
      dispositionNotes: 'Created by form functionality test',
      photoUrls: [],
      assignedCloserId: null,
      assignedCloserName: null
    };
    
    // Create the lead
    const docRef = await db.collection('leads').add(testLead);
    console.log('✅ Created test lead with ID:', docRef.id);
    
    // Verify it was created correctly
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    const createdTime = createdData.scheduledAppointmentTime.toDate();
    
    console.log('\n📊 Verification:');
    console.log('  Status:', createdData.status);
    console.log('  Dispatch Type:', createdData.dispatchType);
    console.log('  Scheduled Time (UTC):', createdTime.toISOString());
    console.log('  Scheduled Time (Local):', createdTime.toLocaleString());
    console.log('  Team ID:', createdData.teamId);
    
    // Check if it would be found by the scheduled leads query
    console.log('\n🔍 Testing scheduled leads query...');
    
    const july10Start = new Date(2025, 6, 10, 0, 0, 0); // July 10, 2025 00:00 local
    const july10End = new Date(2025, 6, 11, 0, 0, 0);   // July 11, 2025 00:00 local
    
    const scheduledQuery = await db.collection('leads')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('status', 'in', ['rescheduled', 'scheduled', 'needs_verification'])
      .where('scheduledAppointmentTime', '>=', admin.firestore.Timestamp.fromDate(july10Start))
      .where('scheduledAppointmentTime', '<', admin.firestore.Timestamp.fromDate(july10End))
      .orderBy('scheduledAppointmentTime', 'asc')
      .get();
    
    console.log(`Found ${scheduledQuery.size} scheduled leads for July 10, 2025`);
    
    let foundOurLead = false;
    scheduledQuery.forEach((doc) => {
      const data = doc.data();
      const scheduledTime = data.scheduledAppointmentTime.toDate();
      console.log(`  - ${data.customerName}: ${scheduledTime.toLocaleString()}`);
      if (doc.id === docRef.id) {
        foundOurLead = true;
        console.log('    ✅ This is our test lead!');
      }
    });
    
    if (foundOurLead) {
      console.log('\n🎉 SUCCESS: Our test lead was found by the scheduled leads query!');
    } else {
      console.log('\n❌ PROBLEM: Our test lead was NOT found by the scheduled leads query!');
    }
    
    // Test date filtering (what the calendar uses)
    console.log('\n📅 Testing date filtering...');
    const isOnJuly10 = createdTime.getDate() === 10 && 
                      createdTime.getMonth() === 6 && 
                      createdTime.getFullYear() === 2025;
    
    console.log('  Date check - Is on July 10, 2025?', isOnJuly10);
    console.log('  Day:', createdTime.getDate());
    console.log('  Month:', createdTime.getMonth() + 1, '(July)');
    console.log('  Year:', createdTime.getFullYear());
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error testing form functionality:', error);
    throw error;
  }
}

testScheduledLeadCreation()
  .then((leadId) => {
    console.log('\n🏁 Test completed successfully!');
    console.log('Lead ID:', leadId);
    console.log('\nNow try:');
    console.log('1. Open the app at http://localhost:9002');
    console.log('2. Go to Lead Queue');
    console.log('3. Click on "Scheduled" tab');
    console.log('4. Set date to July 10, 2025');
    console.log('5. Your test lead should appear!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n🚨 Test failed:', err);
    process.exit(1);
  });
