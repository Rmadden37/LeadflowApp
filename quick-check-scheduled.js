const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'leadflow-4lvrr' });
}

const db = admin.firestore();

async function quickCheck() {
  console.log('🔍 Quick check for scheduled leads...');
  
  try {
    const snapshot = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .limit(10)
      .get();
    
    console.log('Found', snapshot.size, 'scheduled leads');
    
    if (snapshot.empty) {
      console.log('No scheduled leads found. Checking for any leads with scheduledAppointmentTime...');
      
      const anyScheduled = await db.collection('leads')
        .where('scheduledAppointmentTime', '!=', null)
        .limit(10)
        .get();
        
      console.log('Found', anyScheduled.size, 'leads with scheduledAppointmentTime');
      
      anyScheduled.forEach(doc => {
        const data = doc.data();
        console.log('- Lead:', data.customerName, 'Status:', data.status, 'Team:', data.teamId, 'Scheduled:', data.scheduledAppointmentTime ? data.scheduledAppointmentTime.toDate().toISOString() : 'NO TIME');
      });
    } else {
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('- Lead:', data.customerName, 'Status:', data.status, 'Team:', data.teamId, 'Scheduled:', data.scheduledAppointmentTime ? data.scheduledAppointmentTime.toDate().toISOString() : 'NO TIME');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

quickCheck();
