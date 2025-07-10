// Quick check for July 10, 2025 leads
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function checkJuly10Leads() {
  try {
    console.log('🔍 Checking for July 10, 2025 leads...');
    
    // Reference date for July 10, 2025
    const july10 = new Date(2025, 6, 10, 0, 0, 0); // Start of day
    const july11 = new Date(2025, 6, 11, 0, 0, 0); // Start of next day
    
    const july10Start = admin.firestore.Timestamp.fromDate(july10);
    const july10End = admin.firestore.Timestamp.fromDate(july11);
    
    console.log('Date range:', {
      start: july10.toISOString(),
      end: july11.toISOString()
    });
    
    // Get all leads from all teams with status 'scheduled' and date on July 10
    const scheduledLeadsQuery = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .where('scheduledAppointmentTime', '>=', july10Start)
      .where('scheduledAppointmentTime', '<', july10End)
      .get();
    
    console.log(`Found ${scheduledLeadsQuery.size} leads scheduled for July 10, 2025`);
    
    if (scheduledLeadsQuery.empty) {
      console.log('No leads found for July 10, 2025');
    } else {
      scheduledLeadsQuery.forEach((doc) => {
        const data = doc.data();
        console.log(`Lead: ${doc.id}`, {
          customerName: data.customerName,
          status: data.status,
          teamId: data.teamId,
          scheduledTime: data.scheduledAppointmentTime.toDate().toLocaleString(),
          isScheduledForJuly10: data.scheduledAppointmentTime.toDate().getDate() === 10 &&
                              data.scheduledAppointmentTime.toDate().getMonth() === 6 &&
                              data.scheduledAppointmentTime.toDate().getFullYear() === 2025
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking leads:', error);
  }
}

checkJuly10Leads()
  .then(() => console.log('Done checking July 10 leads'))
  .catch(err => console.error('Failed:', err));
