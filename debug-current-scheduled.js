// Quick test to check scheduled leads in the database
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function checkScheduledLeads() {
  try {
    console.log('🔍 Checking scheduled leads in database...');
    console.log('Current time:', new Date().toISOString());
    console.log('');

    // Query all leads with scheduled status
    const scheduledQuery = await db.collection('leads')
      .where('status', '==', 'scheduled')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    console.log(`Found ${scheduledQuery.size} leads with status "scheduled"`);
    console.log('');

    scheduledQuery.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Lead ID: ${doc.id}`);
      console.log(`   Customer: ${data.customerName}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Dispatch Type: ${data.dispatchType}`);
      console.log(`   Team ID: ${data.teamId}`);
      console.log(`   Created: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'N/A'}`);
      console.log(`   Has scheduledAppointmentTime: ${!!data.scheduledAppointmentTime}`);
      if (data.scheduledAppointmentTime) {
        console.log(`   Scheduled for: ${data.scheduledAppointmentTime.toDate().toISOString()}`);
      }
      console.log('');
    });

    // Now check what the scheduled queue query finds
    console.log('🔍 Testing scheduled queue query...');
    const queueQuery = await db.collection('leads')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('status', 'in', ['rescheduled', 'scheduled', 'needs_verification'])
      .orderBy('scheduledAppointmentTime', 'asc')
      .get();

    console.log(`Scheduled queue query found ${queueQuery.size} leads`);
    console.log('');

    queueQuery.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Queue ${index + 1}. ${data.customerName} (${data.status})`);
      console.log(`   Scheduled: ${data.scheduledAppointmentTime ? data.scheduledAppointmentTime.toDate().toISOString() : 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error checking scheduled leads:', error);
  }
}

checkScheduledLeads().then(() => {
  console.log('✅ Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
