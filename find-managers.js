#!/usr/bin/env node

/**
 * Script to find actual manager UIDs for each team (Empire, Takeover Pros, Revolution)
 * This will help us complete the signup form manager assignment functionality
 */

// Import Firebase SDK
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, orderBy } = require('firebase/firestore');

// Firebase config from your env
const firebaseConfig = {
  apiKey: "AIzaSyBc3jmFE6dRXBApmWD9Jg2PO86suqGgaZw",
  authDomain: "leadflow-4lvrr.firebaseapp.com",
  projectId: "leadflow-4lvrr",
  storageBucket: "leadflow-4lvrr.firebasestorage.app",
  messagingSenderId: "13877630896",
  appId: "1:13877630896:web:ab7d2717024960ec36e875",
  measurementId: "G-KDEF2C21SH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findManagers() {
  console.log('🔍 Finding managers for each team...\n');

  try {
    // First, let's check what teams exist
    console.log('📋 Step 1: Finding all teams...');
    const teamsQuery = query(collection(db, "teams"));
    const teamsSnapshot = await getDocs(teamsQuery);
    
    const teams = [];
    teamsSnapshot.forEach(doc => {
      const teamData = doc.data();
      teams.push({ id: doc.id, ...teamData });
      console.log(`   - Team: "${doc.id}" (${teamData.name || 'No name'})`);
    });

    // Check optimized_regions/empire/teams as well
    console.log('\n📋 Step 1b: Finding teams in optimized structure...');
    const optimizedTeamsQuery = query(collection(db, "optimized_regions", "empire", "teams"));
    const optimizedTeamsSnapshot = await getDocs(optimizedTeamsQuery);
    
    optimizedTeamsSnapshot.forEach(doc => {
      const teamData = doc.data();
      console.log(`   - Optimized Team: "${doc.id}" (${teamData.name || 'No name'})`);
    });

    console.log('\n👥 Step 2: Finding all users with manager or admin roles...');
    
    // Query users collection for managers and admins
    const managersQuery = query(
      collection(db, "users"),
      where("role", "in", ["manager", "admin"])
    );
    
    const managersSnapshot = await getDocs(managersQuery);
    const managers = [];
    
    managersSnapshot.forEach(doc => {
      const userData = doc.data();
      managers.push({
        uid: doc.id,
        name: userData.displayName || userData.email || 'Unknown',
        email: userData.email,
        role: userData.role,
        teamId: userData.teamId,
        ...userData
      });
    });

    console.log(`Found ${managers.length} managers/admins:`);
    managers.forEach(manager => {
      console.log(`   - ${manager.name} (${manager.email})`);
      console.log(`     UID: ${manager.uid}`);
      console.log(`     Role: ${manager.role}`);
      console.log(`     Team: ${manager.teamId || 'No team assigned'}`);
      console.log('');
    });

    console.log('\n🎯 Step 3: Mapping managers to teams...');
    
    const teamManagerMapping = {
      empire: null,
      'takeover-pros': null,
      takeoverpros: null,
      revolution: null
    };

    // Try to find managers for each team
    for (const [teamKey, _] of Object.entries(teamManagerMapping)) {
      const teamManagers = managers.filter(m => 
        m.teamId === teamKey || 
        m.teamId === teamKey.replace('-', '') ||
        (teamKey === 'takeover-pros' && m.teamId === 'takeoverpros')
      );
      
      if (teamManagers.length > 0) {
        // Prefer actual managers over admins, and admins over other roles
        const sortedManagers = teamManagers.sort((a, b) => {
          if (a.role === 'manager' && b.role !== 'manager') return -1;
          if (b.role === 'manager' && a.role !== 'manager') return 1;
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (b.role === 'admin' && a.role !== 'admin') return 1;
          return 0;
        });

        teamManagerMapping[teamKey] = sortedManagers[0];
        console.log(`   ✅ ${teamKey.toUpperCase()}: ${sortedManagers[0].name} (${sortedManagers[0].uid})`);
      } else {
        console.log(`   ❌ ${teamKey.toUpperCase()}: No manager found`);
      }
    }

    console.log('\n🔧 Step 4: Generating updated signup form code...');
    
    // Generate the code to update in signup-form.tsx
    let codeSnippet = `
// Updated manager assignments for getManagerForTeam function
const teamManagers = {`;

    for (const [teamKey, manager] of Object.entries(teamManagerMapping)) {
      if (manager) {
        codeSnippet += `\n  "${teamKey}": "${manager.uid}", // ${manager.name} (${manager.email})`;
      } else {
        codeSnippet += `\n  "${teamKey}": "PLACEHOLDER_UID_${teamKey.toUpperCase()}", // No manager found - needs manual assignment`;
      }
    }

    codeSnippet += `
};`;

    console.log(codeSnippet);

    console.log('\n📝 Step 5: Summary and next steps...');
    
    const foundManagers = Object.values(teamManagerMapping).filter(m => m !== null).length;
    const totalTeams = Object.keys(teamManagerMapping).length;
    
    console.log(`   - Found managers for ${foundManagers}/${totalTeams} teams`);
    
    if (foundManagers < totalTeams) {
      console.log('\n⚠️  Some teams don\'t have assigned managers. Options:');
      console.log('   1. Assign existing admins to teams that need managers');
      console.log('   2. Create new manager accounts for those teams');
      console.log('   3. Use admin accounts as fallback managers');
      
      // Show available admins that could be assigned
      const unassignedAdmins = managers.filter(m => 
        m.role === 'admin' && 
        !Object.values(teamManagerMapping).some(tm => tm && tm.uid === m.uid)
      );
      
      if (unassignedAdmins.length > 0) {
        console.log('\n👨‍💼 Available admins that could be assigned as managers:');
        unassignedAdmins.forEach(admin => {
          console.log(`   - ${admin.name} (${admin.uid}) - ${admin.email}`);
        });
      }
    }

    console.log('\n✅ Manager lookup complete!');
    
  } catch (error) {
    console.error('❌ Error finding managers:', error);
    process.exit(1);
  }
}

// Run the script
findManagers()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
