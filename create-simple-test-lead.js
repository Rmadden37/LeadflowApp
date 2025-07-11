const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createSimpleTestLead() {
  try {
    console.log('🧪 Creating simple test lead for TODAY...');
    
    const now = new Date();
    console.log('Current time:', now.toLocaleString());
    console.log('Current date:', now.toDateString());
    
    // Create a lead for 2 hours from now
    const scheduledTime = new Date();
    scheduledTime.setHours(now.getHours() + 2, 0, 0, 0);
    
    console.log('Scheduled time:', scheduledTime.toLocaleString());
    
    const testLead = {
      customerName: 'SIMPLE TEST LEAD',
      customerPhone: '555-SIMPLE-TEST',
      address: '123 Simple Street, Simple City, SC 12345',
      status: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      dispatchType: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'simple-test-setter',
      setterName: 'Simple Test Setter',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      setterVerified: false,
      dispositionNotes: 'Simple test lead for debugging',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    
    console.log('✅ Test lead created!');
    console.log('ID:', docRef.id);
    console.log('Status:', testLead.status);
    console.log('Team ID:', testLead.teamId);
    console.log('Scheduled for:', scheduledTime.toLocaleString());
    
    // Verify it exists in the database
    const doc = await docRef.get();
    const data = doc.data();
    console.log('\n📋 Verification:');
    console.log('Exists:', doc.exists);
    console.log('Status:', data.status);
    console.log('Scheduled time:', data.scheduledAppointmentTime.toDate().toLocaleString());
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

createSimpleTestLead()
  .then(id => {
    console.log('\n🎯 Success! Test lead created with ID:', id);
    console.log('Now check the app to see if it appears in scheduled leads!');
    process.exit(0);
  })
  .catch(err => {
    console.error('💥 Failed:', err);
    process.exit(1);
  });
