const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createUITestLead() {
  try {
    console.log('🎯 Creating a lead exactly as the UI would for July 10, 2025 at 7:00 PM...\n');
    
    // Exact same logic as our fixed form
    const appointmentDate = '2025-07-10';
    const appointmentTime = '19:00';
    const customerName = 'UI Test Customer';
    const customerPhone = '555-UI-TEST';
    const address = '123 UI Test Avenue, UI City, UC 12345';
    const dispatchType = 'scheduled';
    const assignToSelf = false;
    
    // Timezone fix - create date in local timezone
    const scheduledDateTime = new Date(appointmentDate + 'T' + appointmentTime + ':00');
    
    console.log('📝 Form Data:');
    console.log('  Customer Name:', customerName);
    console.log('  Phone:', customerPhone);
    console.log('  Address:', address);
    console.log('  Dispatch Type:', dispatchType);
    console.log('  Appointment Date:', appointmentDate);
    console.log('  Appointment Time:', appointmentTime);
    console.log('  Assign to Self:', assignToSelf);
    console.log('');
    
    console.log('⏰ Timezone Processing:');
    console.log('  Scheduled DateTime (UTC):', scheduledDateTime.toISOString());
    console.log('  Scheduled DateTime (Local):', scheduledDateTime.toLocaleString());
    console.log('  Date:', scheduledDateTime.getDate());
    console.log('  Month:', scheduledDateTime.getMonth() + 1);
    console.log('  Year:', scheduledDateTime.getFullYear());
    console.log('');
    
    // Create lead data exactly as the form does
    const leadData = {
      customerName,
      customerPhone,
      address,
      dispatchType,
      status: dispatchType === "immediate" ? "waiting_assignment" : "scheduled",
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'ui-test-setter',
      setterName: 'UI Test Setter',
      assignedCloserId: assignToSelf ? 'ui-test-setter' : null,
      assignedCloserName: assignToSelf ? 'UI Test Setter' : null,
      dispositionNotes: "",
      photoUrls: [],
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledDateTime)
    };
    
    console.log('💾 Creating lead in Firestore...');
    const docRef = await db.collection('leads').add(leadData);
    console.log('✅ Lead created with ID:', docRef.id);
    
    // Verify the lead was created correctly
    const doc = await docRef.get();
    const data = doc.data();
    const storedTime = data.scheduledAppointmentTime.toDate();
    
    console.log('\n🔍 Verification:');
    console.log('  Lead ID:', docRef.id);
    console.log('  Status:', data.status);
    console.log('  Stored Time (UTC):', storedTime.toISOString());
    console.log('  Stored Time (Local):', storedTime.toLocaleString());
    console.log('  Is July 10?', storedTime.getDate() === 10 && storedTime.getMonth() === 6);
    
    // Test the scheduled leads query
    console.log('\n🔎 Testing Scheduled Leads Query...');
    const today = new Date(2025, 6, 10); // July 10, 2025
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    console.log('  Query Range:');
    console.log('    Start:', startOfDay.toLocaleString());
    console.log('    End:', endOfDay.toLocaleString());
    
    const query = await db.collection('leads')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('status', 'in', ['rescheduled', 'scheduled', 'needs_verification'])
      .where('scheduledAppointmentTime', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .where('scheduledAppointmentTime', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
      .orderBy('scheduledAppointmentTime', 'asc')
      .get();
    
    console.log(`  Found ${query.size} scheduled leads for July 10, 2025`);
    
    let foundOurLead = false;
    query.forEach((queryDoc) => {
      const queryData = queryDoc.data();
      const queryTime = queryData.scheduledAppointmentTime.toDate();
      console.log(`    - ${queryData.customerName}: ${queryTime.toLocaleString()}`);
      if (queryDoc.id === docRef.id) {
        foundOurLead = true;
        console.log('      ✅ THIS IS OUR TEST LEAD!');
      }
    });
    
    if (foundOurLead) {
      console.log('\n🎉 SUCCESS! The lead appears in the scheduled queue!');
    } else {
      console.log('\n❌ PROBLEM: The lead does NOT appear in the scheduled queue!');
    }
    
    return {
      leadId: docRef.id,
      success: foundOurLead,
      scheduledTime: storedTime.toLocaleString()
    };
    
  } catch (error) {
    console.error('❌ Error creating UI test lead:', error);
    throw error;
  }
}

createUITestLead()
  .then((result) => {
    console.log('\n🏁 Test Complete!');
    console.log('Result:', result);
    console.log('\n📱 Next Steps:');
    console.log('1. Open http://localhost:9002 in your browser');
    console.log('2. Click "Create Lead" to test the radio buttons and checkboxes');
    console.log('3. Go to Lead Queue → Scheduled tab');
    console.log('4. Set date to July 10, 2025');
    console.log('5. Your test lead should be visible!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n🚨 Test Failed:', err);
    process.exit(1);
  });
