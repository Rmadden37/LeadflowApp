const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'leadflow-4lvrr' });
}

const db = admin.firestore();

async function createTestScheduledLead() {
  try {
    console.log('Creating test scheduled lead...');
    
    // Create a lead scheduled for 2 hours from now
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours from now
    
    const testLead = {
      customerName: 'TEST SCHEDULED LEAD - ' + now.toISOString().slice(11, 19),
      customerPhone: '555-TEST-001',
      address: '123 Test Street, Test City',
      status: 'rescheduled', // Using rescheduled since that's what the disposition modal sets
      dispatchType: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1', // Default team ID
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      setterVerified: false,
      dispositionNotes: 'Test lead for debugging scheduled queue',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    console.log('✅ Created test lead:', docRef.id);
    console.log('📅 Scheduled for:', scheduledTime.toLocaleString());
    console.log('📅 Status:', testLead.status);
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
  
  process.exit(0);
}

createTestScheduledLead();
