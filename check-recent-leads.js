const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function checkRecentScheduledLeads() {
  try {
    console.log('🔍 Checking for recent scheduled leads...');
    console.log('Current time:', new Date().toLocaleString());
    console.log('Current date:', new Date().toDateString());
    console.log('');

    // Check for leads created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentLeads = await db.collection('leads')
      .where('status', '==', 'scheduled')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
      .orderBy('createdAt', 'desc')
      .get();

    console.log(`Found ${recentLeads.size} scheduled leads created in the last hour`);
    console.log('');

    if (recentLeads.empty) {
      console.log('❌ No recent scheduled leads found.');
      console.log('This might explain why your 7pm lead didn\'t appear.');
    } else {
      recentLeads.forEach((doc, index) => {
        const data = doc.data();
        const scheduledTime = data.scheduledAppointmentTime ? data.scheduledAppointmentTime.toDate() : null;
        const createdTime = data.createdAt ? data.createdAt.toDate() : null;
        
        console.log(`${index + 1}. ${data.customerName}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Created: ${createdTime ? createdTime.toLocaleString() : 'N/A'}`);
        console.log(`   Scheduled: ${scheduledTime ? scheduledTime.toLocaleString() : 'NONE'}`);
        
        if (scheduledTime) {
          const today = new Date();
          const isToday = scheduledTime.toDateString() === today.toDateString();
          console.log(`   Is Today: ${isToday}`);
          console.log(`   Date: ${scheduledTime.toDateString()}`);
          
          // Check if it's around 7pm
          const hour = scheduledTime.getHours();
          if (hour === 19) { // 7pm in 24-hour format
            console.log(`   ⭐ This looks like your 7pm lead!`);
          }
        }
        console.log('');
      });
    }

    // Also check ALL scheduled leads for today to see the complete picture
    console.log('🔍 Checking ALL scheduled leads for today...');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    const todayLeads = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('scheduledAppointmentTime', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
      .where('scheduledAppointmentTime', '<', admin.firestore.Timestamp.fromDate(endOfDay))
      .get();

    console.log(`Found ${todayLeads.size} scheduled leads for today (${today.toDateString()})`);
    
    if (todayLeads.empty) {
      console.log('❌ No scheduled leads found for today');
    } else {
      todayLeads.forEach(doc => {
        const data = doc.data();
        const scheduledTime = data.scheduledAppointmentTime.toDate();
        console.log(`- ${data.customerName}: ${scheduledTime.toLocaleTimeString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking leads:', error);
  }
}

checkRecentScheduledLeads().then(() => {
  console.log('\n🏁 Check completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Check failed:', error);
  process.exit(1);
});
