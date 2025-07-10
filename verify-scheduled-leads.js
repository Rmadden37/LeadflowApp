// Direct query for scheduled leads
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function queryScheduledLeads() {
  try {
    console.log('🔍 Querying scheduled leads...');
    
    // Get a list of all team IDs
    const teamsSnapshot = await db.collection('teams').limit(10).get();
    const teamIds = [];
    
    if (teamsSnapshot.empty) {
      console.log('No teams found. Using default team ID.');
      teamIds.push('YnCKm39O6CYnYWLGQ0v1'); // Default fallback
    } else {
      teamsSnapshot.forEach(doc => {
        console.log(`Team: ${doc.id} - ${doc.data().name || 'Unnamed'}`);
        teamIds.push(doc.id);
      });
    }
    
    // Current date reference (July 10, 2025)
    const today = new Date('2025-07-10T12:00:00');
    
    // For each team, query leads scheduled for today
    for (const teamId of teamIds) {
      console.log(`\n----- Team ID: ${teamId} -----`);
      
      // Query leads scheduled for today for this team
      const scheduledLeads = await db.collection('leads')
        .where('teamId', '==', teamId)
        .where('status', 'in', ['rescheduled', 'scheduled', 'needs_verification'])
        .orderBy('scheduledAppointmentTime', 'asc')
        .get();
      
      console.log(`Found ${scheduledLeads.size} total scheduled leads`);
      
      if (scheduledLeads.empty) {
        console.log('No scheduled leads found for this team.');
        continue;
      }
      
      let todayLeadsCount = 0;
      
      // Process each lead
      scheduledLeads.forEach(doc => {
        const data = doc.data();
        if (!data.scheduledAppointmentTime) {
          console.log(`- Lead ${doc.id}: Missing scheduled time`);
          return;
        }
        
        const appointmentTime = data.scheduledAppointmentTime.toDate();
        const isToday = appointmentTime.getDate() === today.getDate() &&
                       appointmentTime.getMonth() === today.getMonth() &&
                       appointmentTime.getFullYear() === today.getFullYear();
        
        if (isToday) {
          todayLeadsCount++;
          console.log(`- Lead ${doc.id} (${data.customerName}): Scheduled for TODAY at ${appointmentTime.toLocaleTimeString()}`);
        } else {
          console.log(`- Lead ${doc.id} (${data.customerName}): Scheduled for ${appointmentTime.toLocaleDateString()} at ${appointmentTime.toLocaleTimeString()}`);
        }
      });
      
      console.log(`\n✅ Today's leads count: ${todayLeadsCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error querying leads:', error);
  }
}

// Run the query function
queryScheduledLeads()
  .then(() => console.log('\n🏁 Script completed'))
  .catch(error => console.error('\n❌ Script failed:', error));
