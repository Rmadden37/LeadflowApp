const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'leadflow-4lvrr' });
}

const db = admin.firestore();

async function checkScheduledLeads() {
  console.log('🔍 Checking scheduled leads in database...');
  
  try {
    // Query for all scheduled leads
    const snapshot = await db.collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled', 'needs_verification'])
      .get();
    
    console.log(`📊 Found ${snapshot.size} scheduled leads total`);
    
    if (snapshot.empty) {
      console.log('❌ No scheduled leads found');
      
      // Create one for testing
      console.log('📝 Creating a test scheduled lead for today...');
      
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(now.getHours() + 1, 30, 0, 0); // 1.5 hours from now
      
      const testLead = {
        customerName: `TEST LEAD - ${now.toLocaleTimeString()}`,
        customerPhone: '555-TEST-123',
        address: '123 Test Street, Test City, TC 12345',
        status: 'scheduled',
        teamId: 'YnCKm39O6CYnYWLGQ0v1',
        dispatchType: 'scheduled',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(scheduledTime),
        setterVerified: false,
        dispositionNotes: 'Test lead for debugging scheduled queue',
        photoUrls: []
      };
      
      const docRef = await db.collection('leads').add(testLead);
      console.log(`✅ Created test lead ${docRef.id} scheduled for ${scheduledTime.toLocaleString()}`);
    } else {
      const today = new Date();
      let todayCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const scheduledDate = data.scheduledAppointmentTime ? data.scheduledAppointmentTime.toDate() : null;
        const isToday = scheduledDate && 
          scheduledDate.getDate() === today.getDate() &&
          scheduledDate.getMonth() === today.getMonth() &&
          scheduledDate.getFullYear() === today.getFullYear();
        
        if (isToday) todayCount++;
        
        console.log(`- ${data.customerName} (${data.status}): ${scheduledDate ? scheduledDate.toLocaleString() : 'NO TIME'} ${isToday ? '[TODAY]' : ''}`);
      });
      
      console.log(`📅 Leads scheduled for today: ${todayCount}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkScheduledLeads();
