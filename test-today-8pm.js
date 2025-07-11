const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createTodayAt8PM() {
  try {
    const today = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(20, 0, 0, 0); // 8:00 PM today
    
    console.log('Creating test lead for 8PM today...');
    console.log('Current time:', today.toLocaleString());
    console.log('Scheduled time:', scheduledTime.toLocaleString());
    
    const testLead = {
      customerName: 'TEST - 8PM TODAY',
      customerPhone: '555-8PM-TEST',
      address: '123 Evening Street, Today City, TC 12345',
      status: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      dispatchType: 'scheduled',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      setterVerified: false,
      dispositionNotes: 'Test lead for 8PM today - should appear in scheduled queue',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    console.log('✅ Created test lead:', docRef.id);
    console.log('📅 Scheduled for:', scheduledTime.toLocaleString());
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTodayAt8PM().then(() => {
  console.log('🏁 Done');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
