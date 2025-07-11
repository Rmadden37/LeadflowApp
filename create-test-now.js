const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createTestScheduledLead() {
  try {
    console.log('Creating test scheduled lead for today...');
    
    const now = new Date();
    // Create a scheduled time for 2 hours from now
    const scheduledTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
    
    console.log('Current time:', now.toISOString());
    console.log('Scheduled time:', scheduledTime.toISOString());
    
    const testLead = {
      customerName: `TEST FORM LEAD - ${now.getHours()}:${now.getMinutes()}`,
      customerPhone: '555-TEST-FORM',
      address: '123 Test Form Street, Test City, TC 12345',
      dispatchType: 'scheduled',
      status: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-form-user',
      setterName: 'Test Form User',
      assignedCloserId: null,
      assignedCloserName: null,
      dispositionNotes: '',
      photoUrls: [],
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime)
    };
    
    const docRef = await db.collection('leads').add(testLead);
    
    console.log('✅ Test lead created successfully!');
    console.log('Lead ID:', docRef.id);
    console.log('Customer:', testLead.customerName);
    console.log('Status:', testLead.status);
    console.log('Scheduled for:', scheduledTime.toLocaleString());
    console.log('');
    console.log('🎯 Now check the Lead Queue "Scheduled" tab - this lead should appear!');
    console.log('📅 Make sure today\'s date is selected in the date picker');
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

createTestScheduledLead().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
