const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function checkCurrentScheduledLeads() {
  try {
    console.log('🔍 Checking current scheduled leads...');
    console.log('Current date/time:', new Date().toISOString());
    console.log('');

    const query = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .orderBy('scheduledAppointmentTime', 'asc')
      .limit(20)
      .get();
    
    console.log(`Found ${query.size} scheduled leads for team YnCKm39O6CYnYWLGQ0v1`);
    console.log('');

    if (query.empty) {
      console.log('❌ No scheduled leads found!');
      console.log('This explains why the scheduled queue is empty.');
    } else {
      query.forEach((doc, index) => {
        const data = doc.data();
        const scheduledTime = data.scheduledAppointmentTime ? data.scheduledAppointmentTime.toDate() : null;
        
        console.log(`${index + 1}. ${data.customerName}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Dispatch Type: ${data.dispatchType}`);
        console.log(`   Scheduled: ${scheduledTime ? scheduledTime.toISOString() : 'NONE'}`);
        
        if (scheduledTime) {
          const today = new Date();
          const isToday = scheduledTime.toDateString() === today.toDateString();
          console.log(`   Is Today: ${isToday}`);
          console.log(`   Local Time: ${scheduledTime.toLocaleString()}`);
        }
        console.log('');
      });
    }

    // Also check if there are any leads with status 'scheduled' but no scheduledAppointmentTime
    console.log('🔍 Checking for scheduled leads WITHOUT scheduledAppointmentTime...');
    const brokenQuery = await db.collection('leads')
      .where('status', '==', 'scheduled')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .get();
    
    const brokenLeads = [];
    brokenQuery.forEach(doc => {
      const data = doc.data();
      if (!data.scheduledAppointmentTime) {
        brokenLeads.push({id: doc.id, name: data.customerName});
      }
    });

    if (brokenLeads.length > 0) {
      console.log(`❌ Found ${brokenLeads.length} leads with status 'scheduled' but NO scheduledAppointmentTime:`);
      brokenLeads.forEach(lead => {
        console.log(`   - ${lead.name} (${lead.id})`);
      });
      console.log('');
      console.log('💡 These leads won\'t appear in the scheduled queue because they lack the required scheduledAppointmentTime field.');
      console.log('💡 This is likely the root cause of your issue!');
    } else {
      console.log('✅ All scheduled leads have scheduledAppointmentTime field');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCurrentScheduledLeads().then(() => {
  console.log('\n🏁 Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
