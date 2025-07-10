// Query script to find managers and their team assignments
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase config - same as used in the app
const firebaseConfig = {
  apiKey: "AIzaSyBF2CVTj5Jm-3ZB1wQHQXqk2g4ESJKjqJg",
  authDomain: "leadflow-4lvrr.firebaseapp.com",
  projectId: "leadflow-4lvrr",
  storageBucket: "leadflow-4lvrr.appspot.com",
  messagingSenderId: "1001644749998",
  appId: "1:1001644749998:web:a79b3f4e2e1b8a9c7f8e9f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findManagers() {
  console.log('🔍 Searching for managers in the database...\n');

  try {
    // Query users collection for managers and admins
    const usersQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['manager', 'admin'])
    );
    const usersSnapshot = await getDocs(usersQuery);

    console.log('👥 USERS COLLECTION:');
    console.log('====================');
    
    const managers = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const manager = {
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        teamId: userData.teamId,
        teamName: getTeamName(userData.teamId)
      };
      
      managers.push(manager);
      
      console.log(`📋 ${manager.displayName || 'Unknown Name'}`);
      console.log(`   Email: ${manager.email}`);
      console.log(`   UID: ${manager.uid}`);
      console.log(`   Role: ${manager.role}`);
      console.log(`   Team ID: ${manager.teamId || 'No team assigned'}`);
      console.log(`   Team Name: ${manager.teamName}`);
      console.log('');
    });

    // Also check optimized_users collection
    console.log('\n👥 OPTIMIZED_USERS COLLECTION:');
    console.log('===============================');
    
    try {
      const optimizedUsersQuery = query(
        collection(db, 'optimized_users'),
        where('role', 'in', ['manager', 'admin'])
      );
      const optimizedUsersSnapshot = await getDocs(optimizedUsersQuery);

      optimizedUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        const manager = {
          uid: doc.id,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          teamId: userData.teamId || userData.primaryTeam,
          teamName: getTeamName(userData.teamId || userData.primaryTeam)
        };
        
        console.log(`📋 ${manager.displayName || 'Unknown Name'}`);
        console.log(`   Email: ${manager.email}`);
        console.log(`   UID: ${manager.uid}`);
        console.log(`   Role: ${manager.role}`);
        console.log(`   Team ID: ${manager.teamId || 'No team assigned'}`);
        console.log(`   Team Name: ${manager.teamName}`);
        console.log('');
      });
    } catch (error) {
      console.log('   ⚠️  optimized_users collection not accessible or doesn\'t exist');
    }

    // Generate the manager assignment code
    console.log('\n🔧 MANAGER ASSIGNMENT CODE:');
    console.log('============================');
    console.log('Replace the placeholder UIDs in signup-form.tsx with:');
    console.log('');
    
    const empireManager = managers.find(m => m.teamId === 'empire' || m.teamName === 'Empire');
    const takeoverManager = managers.find(m => 
      m.teamId === 'takeover-pros' || 
      m.teamId === 'takeoverpros' || 
      m.teamName?.toLowerCase().includes('takeover')
    );
    const revolutionManager = managers.find(m => 
      m.teamId === 'revolution' || 
      m.teamName?.toLowerCase().includes('revolution')
    );

    console.log('const teamManagers = {');
    console.log(`  "empire": "${empireManager?.uid || 'NO_MANAGER_FOUND'}",`);
    console.log(`  "takeover-pros": "${takeoverManager?.uid || 'NO_MANAGER_FOUND'}",`);
    console.log(`  "revolution": "${revolutionManager?.uid || 'NO_MANAGER_FOUND'}"`);
    console.log('};');

    console.log('\n📊 SUMMARY:');
    console.log('===========');
    console.log(`Total managers/admins found: ${managers.length}`);
    console.log(`Empire team manager: ${empireManager ? empireManager.displayName + ' (' + empireManager.email + ')' : 'NOT FOUND'}`);
    console.log(`Takeover Pros manager: ${takeoverManager ? takeoverManager.displayName + ' (' + takeoverManager.email + ')' : 'NOT FOUND'}`);
    console.log(`Revolution manager: ${revolutionManager ? revolutionManager.displayName + ' (' + revolutionManager.email + ')' : 'NOT FOUND'}`);

  } catch (error) {
    console.error('❌ Error querying managers:', error);
  }

  process.exit(0);
}

function getTeamName(teamId) {
  const teamNames = {
    'empire': 'Empire',
    'takeover-pros': 'Takeover Pros',
    'takeoverpros': 'Takeover Pros',
    'revolution': 'Revolution'
  };
  
  return teamNames[teamId] || (teamId || 'Unknown Team');
}

findManagers();
