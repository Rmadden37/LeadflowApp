const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function checkTodayScheduledLeads() {
  try {
    console.log('🔍 Checking scheduled leads for July 10, 2025...');
    
    // July 10, 2025 range
    const july10Start = new Date(2025, 6, 10, 0, 0, 0); // Start of July 10
    const july10End = new Date(2025, 6, 11, 0, 0, 0);   // Start of July 11
    
    console.log('Date range:');
    console.log('  Start:', july10Start.toISOString());
    console.log('  End:', july10End.toISOString());
    console.log('');

    // Query scheduled leads for July 10
    const todayLeads = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('scheduledAppointmentTime', '>=', admin.firestore.Timestamp.fromDate(july10Start))
      .where('scheduledAppointmentTime', '<', admin.firestore.Timestamp.fromDate(july10End))
      .orderBy('scheduledAppointmentTime', 'asc')
      .get();

    console.log(`Found ${todayLeads.size} scheduled leads for July 10, 2025`);
    console.log('');

    if (todayLeads.empty) {
      console.log('❌ No scheduled leads found for today');
      console.log('This means either:');
      console.log('1. The lead wasn\'t created');
      console.log('2. The lead was created but without scheduledAppointmentTime');
      console.log('3. The lead was created for a different date');
    } else {
      todayLeads.forEach((doc, index) => {
        const data = doc.data();
        const scheduledTime = data.scheduledAppointmentTime.toDate();
        const createdTime = data.createdAt ? data.createdAt.toDate() : null;
        
        console.log(`${index + 1}. ${data.customerName}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Created: ${createdTime ? createdTime.toLocaleString() : 'N/A'}`);
        console.log(`   Scheduled: ${scheduledTime.toLocaleString()}`);
        console.log(`   Hour: ${scheduledTime.getHours()}:${scheduledTime.getMinutes().toString().padStart(2, '0')}`);
        
        if (scheduledTime.getHours() === 19) {
          console.log(`   ⭐ This is a 7:00 PM lead!`);
        }
        console.log('');
      });
    }

    // Also check for any scheduled leads without a proper scheduledAppointmentTime
    console.log('🔍 Checking for broken scheduled leads...');
    const brokenLeads = await db.collection('leads')
      .where('status', '==', 'scheduled')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .get();
    
    let brokenCount = 0;
    brokenLeads.forEach(doc => {
      const data = doc.data();
      if (!data.scheduledAppointmentTime) {
        brokenCount++;
        console.log(`❌ Broken lead: ${data.customerName} (${doc.id}) - has status "scheduled" but no scheduledAppointmentTime`);
      }
    });
    
    if (brokenCount > 0) {
      console.log(`\n❌ Found ${brokenCount} broken scheduled leads`);
      console.log('These leads have status "scheduled" but no scheduledAppointmentTime field');
    }

  } catch (error) {
    console.error('❌ Error checking leads:', error);
  }
}

checkTodayScheduledLeads().then(() => {
  console.log('\n🏁 Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
