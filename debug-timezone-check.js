const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function debugTimezoneHandling() {
  try {
    console.log('🔍 Debugging Timezone Handling for July 10, 2025...\n');
    
    // Test the OLD way (problematic)
    console.log('--- OLD METHOD (Problematic) ---');
    const appointmentDate = '2025-07-10'; // User input
    const appointmentTime = '19:00';       // 7 PM user input
    
    const oldWay = new Date(appointmentDate);
    oldWay.setHours(19, 0, 0, 0);
    console.log('OLD WAY Result:');
    console.log('  UTC:', oldWay.toISOString());
    console.log('  Local:', oldWay.toLocaleString());
    console.log('  UTC Day:', oldWay.getUTCDate());
    console.log('  Local Day:', oldWay.getDate());
    console.log('');
    
    // Test the NEW way (timezone-safe)
    console.log('--- NEW METHOD (Timezone-Safe) ---');
    const newWay = new Date(appointmentDate + 'T' + appointmentTime + ':00');
    console.log('NEW WAY Result:');
    console.log('  UTC:', newWay.toISOString());
    console.log('  Local:', newWay.toLocaleString());
    console.log('  UTC Day:', newWay.getUTCDate());
    console.log('  Local Day:', newWay.getDate());
    console.log('');
    
    // Check what time zone we're in
    console.log('--- TIMEZONE INFO ---');
    console.log('Current timezone offset (minutes):', new Date().getTimezoneOffset());
    console.log('Current timezone offset (hours):', new Date().getTimezoneOffset() / 60);
    console.log('Current local time:', new Date().toLocaleString());
    console.log('Current UTC time:', new Date().toISOString());
    console.log('');
    
    // Test what happens with filtering
    console.log('--- DATE FILTERING TEST ---');
    const july10StartOfDay = new Date(2025, 6, 10, 0, 0, 0); // July 10, 2025 00:00 local
    const july10EndOfDay = new Date(2025, 6, 11, 0, 0, 0);   // July 11, 2025 00:00 local
    
    console.log('Filter range (local time):');
    console.log('  Start:', july10StartOfDay.toLocaleString());
    console.log('  End:', july10EndOfDay.toLocaleString());
    console.log('Filter range (UTC):');
    console.log('  Start:', july10StartOfDay.toISOString());
    console.log('  End:', july10EndOfDay.toISOString());
    console.log('');
    
    console.log('Would OLD method be caught by filter?');
    console.log('  Old way >= start?', oldWay >= july10StartOfDay);
    console.log('  Old way < end?', oldWay < july10EndOfDay);
    console.log('  Result: IN RANGE?', (oldWay >= july10StartOfDay && oldWay < july10EndOfDay));
    console.log('');
    
    console.log('Would NEW method be caught by filter?');
    console.log('  New way >= start?', newWay >= july10StartOfDay);
    console.log('  New way < end?', newWay < july10EndOfDay);
    console.log('  Result: IN RANGE?', (newWay >= july10StartOfDay && newWay < july10EndOfDay));
    console.log('');
    
    // Check current leads for July 10
    console.log('--- CHECKING CURRENT LEADS FOR JULY 10 ---');
    const july10LeadsQuery = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('scheduledAppointmentTime', '>=', admin.firestore.Timestamp.fromDate(july10StartOfDay))
      .where('scheduledAppointmentTime', '<', admin.firestore.Timestamp.fromDate(july10EndOfDay))
      .get();
    
    console.log(`Found ${july10LeadsQuery.size} leads scheduled for July 10, 2025`);
    
    if (!july10LeadsQuery.empty) {
      july10LeadsQuery.forEach((doc, index) => {
        const data = doc.data();
        const scheduledTime = data.scheduledAppointmentTime.toDate();
        
        console.log(`${index + 1}. ${data.customerName}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Status: ${data.status}`);
        console.log(`   Scheduled (Local): ${scheduledTime.toLocaleString()}`);
        console.log(`   Scheduled (UTC): ${scheduledTime.toISOString()}`);
        console.log(`   Created: ${data.createdAt ? data.createdAt.toDate().toLocaleString() : 'N/A'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error debugging timezone handling:', error);
  }
}

debugTimezoneHandling().then(() => {
  console.log('🏁 Debug complete');
  process.exit(0);
}).catch(err => {
  console.error('🚨 Debug failed:', err);
  process.exit(1);
});
