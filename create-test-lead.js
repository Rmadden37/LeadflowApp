// Quick test to create a scheduled lead for today
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Check if we already have an app
let app;
if (getApps().length === 0) {
  app = initializeApp({
    projectId: 'leadflow-4lvrr'
  });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

async function createTestLead() {
  try {
    console.log('🚀 Creating test lead...');
    
    const now = new Date();
    const todayAt3PM = new Date();
    todayAt3PM.setHours(15, 0, 0, 0); // 3:00 PM today
    
    const testLead = {
      customerName: `Test Lead ${now.getHours()}:${now.getMinutes()}`,
      customerPhone: '555-TEST-001',
      address: '123 Test Street, Test City, TC 12345',
      status: 'scheduled',
      dispatchType: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      scheduledAppointmentTime: Timestamp.fromDate(todayAt3PM),
      setterVerified: false,
      dispositionNotes: 'Test lead created for debugging',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    console.log('✅ Test lead created with ID:', docRef.id);
    console.log('📅 Scheduled for:', todayAt3PM.toLocaleString());
    console.log('🏢 Team ID:', testLead.teamId);
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

createTestLead().then(() => {
  console.log('🏁 Done');
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
