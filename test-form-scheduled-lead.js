// Test script to create a scheduled lead exactly like the form does
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createFormStyleScheduledLead() {
  try {
    console.log('🔧 Creating scheduled lead exactly like the form does...');
    
    const now = new Date();
    const appointmentDate = new Date(); // Today
    const appointmentTime = "15:30"; // 3:30 PM
    
    // Parse time exactly like the form does
    const [hours, minutes] = appointmentTime.split(':').map(Number);
    const scheduledDateTime = new Date(appointmentDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    console.log('Scheduled date/time:', scheduledDateTime.toLocaleString());
    
    // Create lead data exactly like the form
    const leadData = {
      customerName: `FORM TEST LEAD - ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
      customerPhone: '555-FORM-TEST',
      address: '123 Form Test Street, Test City, TC 12345',
      dispatchType: 'scheduled',
      status: 'scheduled', // This is what the form sets: dispatchType === "immediate" ? "waiting_assignment" : "scheduled"
      teamId: 'YnCKm39O6CYnYWLGQ0v1', // Default team ID
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-setter-form',
      setterName: 'Form Test Setter',
      assignedCloserId: null, // Form typically doesn't assign to self unless checked
      assignedCloserName: null,
      dispositionNotes: '',
      photoUrls: [],
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledDateTime)
    };
    
    // Add to Firestore exactly like the form
    const docRef = await db.collection('leads').add(leadData);
    
    console.log('✅ SUCCESS! Form-style scheduled lead created:');
    console.log('   Lead ID:', docRef.id);
    console.log('   Customer:', leadData.customerName);
    console.log('   Status:', leadData.status);
    console.log('   Dispatch Type:', leadData.dispatchType);
    console.log('   Team ID:', leadData.teamId);
    console.log('   Scheduled for:', scheduledDateTime.toLocaleString());
    console.log('   Has scheduledAppointmentTime:', !!leadData.scheduledAppointmentTime);
    
    // Verify it was created correctly
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    
    console.log('\n✅ VERIFICATION:');
    console.log('   Lead exists:', createdDoc.exists);
    console.log('   Status in DB:', createdData.status);
    console.log('   Dispatch type in DB:', createdData.dispatchType);
    console.log('   Team ID in DB:', createdData.teamId);
    console.log('   Has scheduledAppointmentTime in DB:', !!createdData.scheduledAppointmentTime);
    console.log('   Scheduled time in DB:', createdData.scheduledAppointmentTime.toDate().toLocaleString());
    
    // Now query to see if it would be found by the scheduled leads query
    console.log('\n🔍 TESTING SCHEDULED LEADS QUERY...');
    
    const scheduledQuery = await db.collection('leads')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('status', 'in', ['rescheduled', 'scheduled', 'needs_verification'])
      .orderBy('scheduledAppointmentTime', 'asc')
      .get();
    
    console.log(`   Query found ${scheduledQuery.size} scheduled leads total`);
    
    let foundOurLead = false;
    scheduledQuery.forEach(doc => {
      const data = doc.data();
      if (doc.id === docRef.id) {
        foundOurLead = true;
        console.log(`   ✅ Found our test lead: ${data.customerName}`);
      } else {
        console.log(`   - Other lead: ${data.customerName} (${data.status})`);
      }
    });
    
    if (!foundOurLead) {
      console.log('   ❌ Our test lead was NOT found by the scheduled query!');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Check the Lead Queue "Scheduled" tab');
    console.log('2. Make sure today\'s date is selected');
    console.log('3. This lead should appear if date filtering is working');
    
  } catch (error) {
    console.error('❌ ERROR creating form-style test lead:', error);
    console.error('Stack trace:', error.stack);
  }
}

createFormStyleScheduledLead().then(() => {
  console.log('\n🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
