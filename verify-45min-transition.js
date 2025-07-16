#!/usr/bin/env node

/**
 * 45-Minute Lead Transition Verification Script
 * Helps test and monitor the new server-side scheduled function
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (requires service account key)
if (!admin.apps.length) {
  try {
    // Try to use default credentials or service account
    admin.initializeApp({
      projectId: 'leadflow-4lvrr'
    });
  } catch (error) {
    console.log('⚠️ Firebase initialization failed. Make sure you have proper credentials.');
    console.log('Run: firebase login or set GOOGLE_APPLICATION_CREDENTIALS');
    process.exit(1);
  }
}

const db = admin.firestore();

async function checkScheduledLeads() {
  console.log('🔍 CHECKING SCHEDULED LEADS FOR 45-MINUTE TRANSITION');
  console.log('='.repeat(60));
  
  try {
    const now = new Date();
    const fortyFiveMinutesFromNow = new Date(now.getTime() + (45 * 60 * 1000));
    
    console.log(`📅 Current time: ${now.toISOString()}`);
    console.log(`⏰ 45-minute window: ${fortyFiveMinutesFromNow.toISOString()}`);
    console.log('');
    
    // Query for scheduled leads that should transition
    const scheduledLeadsQuery = await db
      .collection('leads')
      .where('status', 'in', ['scheduled', 'rescheduled'])
      .get();
    
    console.log(`📊 Total scheduled/rescheduled leads: ${scheduledLeadsQuery.size}`);
    console.log('');
    
    let verifiedCount = 0;
    let readyForTransitionCount = 0;
    let alreadyProcessedCount = 0;
    
    scheduledLeadsQuery.docs.forEach((doc, index) => {
      const lead = doc.data();
      const appointmentTime = lead.scheduledAppointmentTime?.toDate();
      
      if (!appointmentTime) {
        console.log(`${index + 1}. ${lead.customerName} - ⚠️ No appointment time set`);
        return;
      }
      
      const timeUntilAppointment = appointmentTime.getTime() - now.getTime();
      const minutesUntil = Math.floor(timeUntilAppointment / (60 * 1000));
      const isVerified = lead.setterVerified === true;
      const isInWindow = timeUntilAppointment <= (45 * 60 * 1000) && timeUntilAppointment > 0;
      
      if (isVerified) verifiedCount++;
      if (isVerified && isInWindow) readyForTransitionCount++;
      if (lead.status === 'waiting_assignment') alreadyProcessedCount++;
      
      const status = isVerified ? '✅ Verified' : '❌ Unverified';
      const timing = isInWindow ? `🕐 Ready (${minutesUntil}m)` : `⏳ ${minutesUntil}m until window`;
      
      console.log(`${index + 1}. ${lead.customerName || 'Unknown'}`);
      console.log(`   Status: ${lead.status} | ${status} | ${timing}`);
      console.log(`   Appointment: ${appointmentTime.toLocaleString()}`);
      console.log('');
    });
    
    console.log('📈 SUMMARY:');
    console.log(`   Verified leads: ${verifiedCount}`);
    console.log(`   Ready for transition: ${readyForTransitionCount}`);
    console.log(`   Already in waiting_assignment: ${alreadyProcessedCount}`);
    console.log('');
    
    // Check recent activity logs
    console.log('📋 RECENT TRANSITION ACTIVITIES:');
    const recentActivities = await db
      .collection('activities')
      .where('type', '==', 'scheduled_lead_transition')
      .orderBy('processedAt', 'desc')
      .limit(5)
      .get();
    
    if (recentActivities.empty) {
      console.log('   No recent transition activities found');
    } else {
      recentActivities.docs.forEach((doc, index) => {
        const activity = doc.data();
        const time = activity.processedAt?.toDate?.()?.toLocaleString() || 'Unknown time';
        console.log(`   ${index + 1}. ${time} - Processed ${activity.count} leads`);
      });
    }
    
    console.log('');
    console.log('🎯 NEXT STEPS:');
    if (readyForTransitionCount > 0) {
      console.log(`   ✅ ${readyForTransitionCount} leads ready for transition`);
      console.log('   ⏰ Function should process these within 2 minutes');
    } else {
      console.log('   ℹ️ No leads currently in 45-minute transition window');
    }
    
  } catch (error) {
    console.error('❌ Error checking scheduled leads:', error);
  }
}

async function createTestLead() {
  console.log('🧪 CREATING TEST SCHEDULED LEAD');
  console.log('='.repeat(40));
  
  try {
    const now = new Date();
    const testAppointmentTime = new Date(now.getTime() + (44 * 60 * 1000)); // 44 minutes from now
    
    const testLead = {
      customerName: `Test Lead - ${now.toISOString().slice(0, 16)}`,
      customerPhone: '+1234567890',
      customerEmail: 'test@example.com',
      status: 'scheduled',
      scheduledAppointmentTime: admin.firestore.Timestamp.fromDate(testAppointmentTime),
      setterVerified: true,
      teamId: '1xDDWdFGw9A3e8BN1odw', // Default team - adjust as needed
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
      address: '123 Test Street, Test City, TC 12345',
      setterName: 'Test Setter',
      dispatchType: 'scheduled'
    };
    
    const docRef = await db.collection('leads').add(testLead);
    
    console.log('✅ Test lead created successfully!');
    console.log(`   Lead ID: ${docRef.id}`);
    console.log(`   Customer: ${testLead.customerName}`);
    console.log(`   Appointment: ${testAppointmentTime.toLocaleString()}`);
    console.log(`   Status: ${testLead.status} (verified: ${testLead.setterVerified})`);
    console.log('');
    console.log('⏰ This lead should transition to waiting_assignment within 2 minutes');
    console.log('🔍 Monitor with: firebase functions:log --only processScheduledLeadTransitions');
    
  } catch (error) {
    console.error('❌ Error creating test lead:', error);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'test') {
  createTestLead();
} else if (command === 'check' || !command) {
  checkScheduledLeads();
} else {
  console.log('📖 USAGE:');
  console.log('  node verify-45min-transition.js check   # Check current scheduled leads');
  console.log('  node verify-45min-transition.js test    # Create a test lead for transition');
}
