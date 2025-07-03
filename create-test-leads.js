/**
 * Simple test utility to create sample leads for testing Lead Queue styling
 * Run with: node create-test-leads.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./leadflow-4lvrr-c0ece655e181.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    console.log('Make sure the service account file exists in the project root.');
    process.exit(1);
  }
}

const db = admin.firestore();

// Sample test data
const sampleLeads = [
  {
    customerName: "John Smith",
    customerPhone: "+1-555-0123",
    address: "123 Main St, Springfield, IL 62701",
    dispatchType: "immediate",
    status: "waiting_assignment",
    teamId: "your-team-id", // You'll need to replace this with actual team ID
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    setterId: "test-setter-id",
    setterName: "Test Setter",
  },
  {
    customerName: "Sarah Johnson",
    customerPhone: "+1-555-0124", 
    address: "456 Oak Avenue, Springfield, IL 62702",
    dispatchType: "immediate",
    status: "waiting_assignment",
    teamId: "your-team-id",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    setterId: "test-setter-id",
    setterName: "Test Setter",
  },
  {
    customerName: "Mike Davis",
    customerPhone: "+1-555-0125",
    address: "789 Pine St, Springfield, IL 62703", 
    dispatchType: "scheduled",
    status: "scheduled",
    teamId: "your-team-id",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    setterId: "test-setter-id",
    setterName: "Test Setter",
    scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)), // 2 hours from now
    setterVerified: true
  },
  {
    customerName: "Lisa Wilson", 
    customerPhone: "+1-555-0126",
    address: "321 Elm St, Springfield, IL 62704",
    dispatchType: "scheduled", 
    status: "scheduled",
    teamId: "your-team-id",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    setterId: "test-setter-id",
    setterName: "Test Setter",
    scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 4 * 60 * 60 * 1000)), // 4 hours from now
    setterVerified: false
  }
];

async function createTestLeads() {
  console.log('🔥 Creating test leads...');
  
  try {
    const batch = db.batch();
    
    sampleLeads.forEach((lead, index) => {
      const leadRef = db.collection('leads').doc();
      batch.set(leadRef, lead);
      console.log(`  ${index + 1}. ${lead.customerName} (${lead.dispatchType})`);
    });
    
    await batch.commit();
    
    console.log('✅ Successfully created test leads!');
    console.log('');
    console.log('📝 Note: Make sure to update "your-team-id" in the script with your actual team ID');
    console.log('🎯 You can now check the Lead Queue to see the new styling!');
    
  } catch (error) {
    console.error('❌ Error creating test leads:', error);
  }
  
  process.exit(0);
}

// Run the function
createTestLeads();
