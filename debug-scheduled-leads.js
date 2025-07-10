const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function debugScheduledLeads() {
  try {
    console.log('🔍 Debugging Scheduled Leads...\n');
    
    // Get all leads to see what we have
    const allLeadsQuery = db.collection('leads').limit(10);
    const allLeadsSnapshot = await allLeadsQuery.get();
    
    console.log(`Found ${allLeadsSnapshot.size} total leads in database`);
    
    allLeadsSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Lead ${index + 1} (${doc.id}) ---`);
      console.log('Customer:', data.customerName);
      console.log('Status:', data.status);
      console.log('Dispatch Type:', data.dispatchType);
      console.log('Team ID:', data.teamId);
      console.log('Has scheduledAppointmentTime:', !!data.scheduledAppointmentTime);
      
      if (data.scheduledAppointmentTime) {
        const appointmentTime = data.scheduledAppointmentTime.toDate();
        console.log('Scheduled Time:', appointmentTime.toISOString());
        console.log('Scheduled Time (Local):', appointmentTime.toLocaleString());
        
        // Check if it's today
        const today = new Date();
        const isToday = appointmentTime.toDateString() === today.toDateString();
        console.log('Is Today:', isToday);
      }
      
      console.log('Created At:', data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A');
    });
    
    // Now query specifically for scheduled leads
    console.log('\n\n🔍 Querying Scheduled Leads...\n');
    
    const scheduledQuery = db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .orderBy('scheduledAppointmentTime', 'asc');
    
    const scheduledSnapshot = await scheduledQuery.get();
    
    console.log(`Found ${scheduledSnapshot.size} scheduled leads`);
    
    scheduledSnapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n--- Scheduled Lead ${index + 1} (${doc.id}) ---`);
      console.log('Customer:', data.customerName);
      console.log('Status:', data.status);
      console.log('Team ID:', data.teamId);
      if (data.scheduledAppointmentTime) {
        const appointmentTime = data.scheduledAppointmentTime.toDate();
        console.log('Scheduled Time:', appointmentTime.toISOString());
        console.log('Scheduled Time (Local):', appointmentTime.toLocaleString());
      }
    });
    
    // Create a test scheduled lead for today
    console.log('\n\n📅 Creating Test Scheduled Lead for Today...\n');
    
    const now = new Date();
    const futureTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // 3 hours from now
    
    const testLead = {
      customerName: 'Test Scheduled Lead - ' + now.toISOString().slice(11, 19),
      customerPhone: '555-TEST-' + Math.floor(Math.random() * 1000),
      address: '123 Test Street, Test City, TC 12345',
      status: 'scheduled',
      dispatchType: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1', // Default team ID
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-setter-' + Date.now(),
      setterName: 'Test Setter',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(futureTime),
      setterVerified: false,
      dispositionNotes: 'Test lead for debugging scheduled functionality',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    console.log('✅ Created test lead with ID:', docRef.id);
    console.log('📅 Scheduled for:', futureTime.toLocaleString());
    console.log('🕐 Current time:', now.toLocaleString());
    
    // Verify the lead was created properly
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    console.log('\n✅ Verification - Lead was created with:');
    console.log('Status:', createdData.status);
    console.log('Dispatch Type:', createdData.dispatchType);
    console.log('Scheduled Time:', createdData.scheduledAppointmentTime.toDate().toLocaleString());
    
  } catch (error) {
    console.error('❌ Error debugging scheduled leads:', error);
  }
}

debugScheduledLeads().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(err => {
  console.error('🚨 Debug failed:', err);
  process.exit(1);
});
