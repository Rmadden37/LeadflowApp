// Create a test lead scheduled for today to test our fixes
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createTodayTestLead() {
  try {
    console.log('🚀 Creating test lead for TODAY...');
    
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(now.getHours() + 2, 0, 0, 0); // 2 hours from now
    
    console.log('Current time:', now.toLocaleString());
    console.log('Scheduled time:', scheduledTime.toLocaleString());
    
    // Use "scheduled" status (our new option) instead of "rescheduled"
    const testLead = {
      customerName: `TEST SCHEDULED LEAD - ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
      customerPhone: '555-TEST-NEW',
      address: '123 Test Street, Test City, TC 12345',
      status: 'scheduled', // Using the new "scheduled" status we added
      teamId: 'YnCKm39O6CYnYWLGQ0v1', // Default team ID
      dispatchType: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-setter-id',
      setterName: 'Test Setter',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      setterVerified: false,
      dispositionNotes: 'Test lead created to verify scheduled queue fixes',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    
    console.log('✅ Test lead created successfully!');
    console.log('📋 Lead ID:', docRef.id);
    console.log('📅 Scheduled for:', scheduledTime.toLocaleString());
    console.log('🏢 Team ID:', testLead.teamId);
    console.log('🔖 Status:', testLead.status);
    
    // Verify the creation
    const created = await docRef.get();
    const data = created.data();
    console.log('\n✅ Verification:');
    console.log('  Status in DB:', data.status);
    console.log('  Scheduled time in DB:', data.scheduledAppointmentTime.toDate().toLocaleString());
    
    console.log('\n🎯 Now check the Scheduled tab in the Lead Queue to see if this lead appears!');
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

createTodayTestLead()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
