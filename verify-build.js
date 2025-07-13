#!/usr/bin/env node

// Build verification script for Firebase App Hosting
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Starting build verification for Firebase App Hosting...');

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found');
  process.exit(1);
}

// Check if next.config.js exists
if (!fs.existsSync('next.config.js')) {
  console.error('❌ next.config.js not found');
  process.exit(1);
}

// Run build
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    // Check if .next directory was created
    if (fs.existsSync('.next')) {
      console.log('✅ Build successful! .next directory created');
      
      // Check for standalone build
      if (fs.existsSync('.next/standalone')) {
        console.log('✅ Standalone build detected - ready for App Hosting');
      } else {
        console.log('⚠️  Standalone build not found, but build completed');
      }
    } else {
      console.error('❌ Build completed but .next directory not found');
      process.exit(1);
    }
  } else {
    console.error(`❌ Build failed with exit code ${code}`);
    process.exit(1);
  }
});

buildProcess.on('error', (err) => {
  console.error('❌ Build process error:', err);
  process.exit(1);
});
