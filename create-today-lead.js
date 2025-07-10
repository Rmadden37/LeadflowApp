// Quick script to create a test lead for July 10, 2025
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createTodayTestLeadSimple() {
  try {
    // Hardcoded date for July 10, 2025 at 3:00 PM
    const scheduledDate = new Date(2025, 6, 10, 15, 0, 0); // July is month 6 (0-based)
    
    console.log('Creating test lead scheduled for:', scheduledDate.toLocaleString());
    
    // Get team ID from an existing lead
    let teamId = 'YnCKm39O6CYnYWLGQ0v1'; // Default fallback
    
    // Try to get a real team ID from the database
    try {
      const anyLead = await db.collection('leads').limit(1).get();
      if (!anyLead.empty) {
        const firstLead = anyLead.docs[0].data();
        if (firstLead.teamId) {
          teamId = firstLead.teamId;
          console.log('Using team ID from existing lead:', teamId);
        }
      }
    } catch (err) {
      console.log('Could not fetch existing lead, using default team ID');
    }
    
    // Create a test lead for July 10, 2025 at 3:00 PM
    const testLead = {
      customerName: 'TODAY TEST LEAD (JULY 10, 3PM)',
      customerPhone: '555-TEST-JULY10',
      address: '123 July Street, Test City, TC 12345',
      status: 'scheduled',
      teamId: teamId,
      dispatchType: 'scheduled',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledDate),
      setterVerified: false,
      dispositionNotes: 'Test lead for July 10, 2025 at 3:00 PM',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    console.log('✅ Test lead created with ID:', docRef.id);
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

createTodayTestLeadSimple()
  .then(() => console.log('Done!'))
  .catch(err => console.error('Failed:', err));
