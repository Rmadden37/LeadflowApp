const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function testTimezoneFixWithNewLead() {
  try {
    console.log('🧪 Testing Timezone Fix with New Lead Creation...\n');
    
    // Test data - July 10, 2025 at 7 PM
    const appointmentDate = '2025-07-10'; 
    const appointmentTime = '19:00';       
    
    console.log('Input data:');
    console.log('  Date:', appointmentDate);
    console.log('  Time:', appointmentTime);
    
    // Apply the NEW timezone fix (like our form does)
    const scheduledDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
    
    console.log('\nTimezone fix result:');
    console.log('  Local time:', scheduledDateTime.toLocaleString());
    console.log('  UTC time:', scheduledDateTime.toISOString());
    console.log('  Date value:', scheduledDateTime.getDate());
    console.log('  Month value:', scheduledDateTime.getMonth() + 1); // +1 because months are 0-indexed
    console.log('  Year value:', scheduledDateTime.getFullYear());
    
    // Create test lead using the fix
    const testLead = {
      customerName: 'TIMEZONE TEST LEAD - ' + Date.now(),
      customerPhone: '555-TIMEZONE-' + Math.floor(Math.random() * 1000),
      address: '123 Timezone Test Street, Timezone City, TC 12345',
      status: 'scheduled',
      dispatchType: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'timezone-test-setter',
      setterName: 'Timezone Test Setter',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledDateTime),
      setterVerified: false,
      dispositionNotes: 'Test lead for timezone fix verification',
      photoUrls: []
    };
    
    console.log('\n📝 Creating test lead...');
    const docRef = await db.collection('leads').add(testLead);
    console.log('✅ Created test lead with ID:', docRef.id);
    
    // Verify it was stored correctly
    const storedDoc = await docRef.get();
    const storedData = storedDoc.data();
    const storedTime = storedData.scheduledAppointmentTime.toDate();
    
    console.log('\n✅ Verification - Lead stored with:');
    console.log('  Stored time (Local):', storedTime.toLocaleString());
    console.log('  Stored time (UTC):', storedTime.toISOString());
    console.log('  Date matches input?', storedTime.getDate() === 10);
    console.log('  Month matches input?', storedTime.getMonth() === 6); // July is month 6
    console.log('  Year matches input?', storedTime.getFullYear() === 2025);
    console.log('  Hour matches input?', storedTime.getHours() === 19);
    
    // Now test the query that the lead queue uses
    console.log('\n🔍 Testing lead queue query...');
    const july10Start = new Date(2025, 6, 10, 0, 0, 0); // Start of July 10
    const july10End = new Date(2025, 6, 11, 0, 0, 0);   // Start of July 11
    
    console.log('Query range:');
    console.log('  Start:', july10Start.toLocaleString());
    console.log('  End:', july10End.toLocaleString());
    
    const queryResult = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('scheduledAppointmentTime', '>=', admin.firestore.Timestamp.fromDate(july10Start))
      .where('scheduledAppointmentTime', '<', admin.firestore.Timestamp.fromDate(july10End))
      .get();
    
    console.log(`\n📊 Query found ${queryResult.size} leads for July 10, 2025`);
    
    let foundOurLead = false;
    queryResult.forEach((doc) => {
      const data = doc.data();
      if (doc.id === docRef.id) {
        foundOurLead = true;
        console.log('✅ Our test lead was found in the query!');
      }
      console.log(`  ${data.customerName}: ${data.scheduledAppointmentTime.toDate().toLocaleString()}`);
    });
    
    if (!foundOurLead && queryResult.size > 0) {
      console.log('❌ Our test lead was NOT found in the query, but other leads were');
    } else if (!foundOurLead) {
      console.log('❌ Our test lead was NOT found and no leads returned by query');
    }
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error testing timezone fix:', error);
  }
}

testTimezoneFixWithNewLead().then((leadId) => {
  console.log('\n🏁 Test complete');
  if (leadId) {
    console.log(`💡 Test lead ID: ${leadId}`);
    console.log('💡 You can delete this test lead from the database if needed');
  }
  process.exit(0);
}).catch(err => {
  console.error('🚨 Test failed:', err);
  process.exit(1);
});
