// A minimal script to create a test lead for today
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createMinimalTestLead() {
  try {
    // Hard-coded date for July 10, 2025
    const today = new Date('2025-07-10T12:00:00');
    const scheduledTime = new Date('2025-07-10T15:00:00'); // 3 PM on July 10, 2025
    
    console.log('Current date reference:', today.toLocaleString());
    console.log('Creating test lead scheduled for:', scheduledTime.toLocaleString());
    
    // Get the correct team ID from an existing lead if available
    const existingLeadsQuery = await db.collection('leads').limit(1).get();
    let teamId = 'YnCKm39O6CYnYWLGQ0v1'; // Default fallback
    
    if (!existingLeadsQuery.empty) {
      const firstLead = existingLeadsQuery.docs[0].data();
      if (firstLead.teamId) {
        teamId = firstLead.teamId;
        console.log('Using team ID from existing lead:', teamId);
      }
    }
    
    const testLead = {
      customerName: 'TEST LEAD - TODAY (JULY 10)',
      customerPhone: '555-TEST-999',
      address: '123 Test Street, Test City, TC 12345',
      status: 'scheduled',
      teamId: teamId,
      dispatchType: 'scheduled',
      createdAt: admin.firestore.Timestamp.fromDate(today),
      updatedAt: admin.firestore.Timestamp.fromDate(today),
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      setterVerified: false,
      dispositionNotes: 'Test lead for debugging scheduled leads',
      photoUrls: []
    };
    
    // Create the lead
    const docRef = await db.collection('leads').add(testLead);
    
    console.log('✅ Test lead created with ID:', docRef.id);
    console.log('📅 Scheduled for:', scheduledTime.toLocaleString());
    console.log('🏢 Team ID used:', teamId);
    
    // Confirm the lead was created with the correct data
    const created = await docRef.get();
    const data = created.data();
    
    console.log('\nConfirmation - Lead details:');
    console.log('- Customer:', data.customerName);
    console.log('- Status:', data.status);
    console.log('- Team ID:', data.teamId);
    console.log('- Scheduled time:', data.scheduledAppointmentTime.toDate().toLocaleString());
    console.log('- Today is July 10, 2025');
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

// Execute the function
createMinimalTestLead()
  .then(() => console.log('Script completed'))
  .catch(err => console.error('Script failed:', err));
