const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'leadflow-4lvrr'
  });
}

const db = admin.firestore();

async function createTodayTestLead() {
  try {
    console.log('🧪 Creating test lead for today...');
    
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(now.getHours() + 3, 0, 0, 0); // 3 hours from now, on the hour
    
    console.log('Current time:', now.toLocaleString());
    console.log('Scheduled time:', scheduledTime.toLocaleString());
    
    const testLead = {
      customerName: 'TEST LEAD - TODAY',
      customerPhone: '555-TEST-123',
      address: '123 Test Street, Today City, TC 12345',
      status: 'scheduled',
      teamId: 'YnCKm39O6CYnYWLGQ0v1', // Default team ID
      dispatchType: 'scheduled',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      setterId: 'test-setter-id',
      setterName: 'Test Setter',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
      setterVerified: false,
      dispositionNotes: 'Test lead for debugging - safe to delete',
      photoUrls: []
    };
    
    const docRef = await db.collection('leads').add(testLead);
    console.log(`✅ Created test lead: ${docRef.id}`);
    console.log(`📅 Scheduled for: ${scheduledTime.toLocaleString()}`);
    console.log(`🏢 Team ID: ${testLead.teamId}`);
    
    // Verify it was created correctly
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();
    console.log('\n✅ Verification:');
    console.log('  Status:', createdData.status);
    console.log('  Scheduled time:', createdData.scheduledAppointmentTime.toDate().toLocaleString());
    console.log('  Team ID:', createdData.teamId);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

async function queryTodayScheduledLeads() {
  try {
    console.log('\n🔍 Querying today\'s scheduled leads...');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    
    console.log('Start of day:', startOfDay.toLocaleString());
    console.log('End of day:', endOfDay.toLocaleString());
    
    // Query for scheduled leads for the team
    const teamQuery = await db.collection('leads')
      .where('teamId', '==', 'YnCKm39O6CYnYWLGQ0v1')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .orderBy('scheduledAppointmentTime', 'asc')
      .get();
    
    console.log(`\n📊 Found ${teamQuery.size} scheduled leads for team`);
    
    let todayCount = 0;
    teamQuery.forEach(doc => {
      const data = doc.data();
      const appointmentTime = data.scheduledAppointmentTime?.toDate();
      
      if (appointmentTime) {
        const isToday = appointmentTime >= startOfDay && appointmentTime < endOfDay;
        console.log(`  ${data.customerName}: ${appointmentTime.toLocaleString()} (${isToday ? 'TODAY' : 'OTHER DAY'})`);
        if (isToday) todayCount++;
      } else {
        console.log(`  ${data.customerName}: NO APPOINTMENT TIME`);
      }
    });
    
    console.log(`\n📅 Today's leads count: ${todayCount}`);
    
  } catch (error) {
    console.error('❌ Error querying leads:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--create')) {
    await createTodayTestLead();
  }
  
  await queryTodayScheduledLeads();
  process.exit(0);
}

main().catch(console.error);
