#!/usr/bin/env node

/**
 * Authentication Performance Test
 * 
 * This script tests the authentication loading performance
 * by monitoring console logs and timing auth completion.
 */

const puppeteer = require('puppeteer');

async function testAuthPerformance() {
  console.log('🚀 Starting authentication performance test...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set up console monitoring
  const logs = [];
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push({ timestamp: Date.now(), message: text });
    
    if (text.includes('🔥') || text.includes('Auth') || text.includes('loading')) {
      console.log(`[${new Date().toISOString()}] ${text}`);
    }
  });
  
  const startTime = Date.now();
  
  try {
    // Navigate to the app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:9003', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    // Wait for authentication to complete or timeout
    console.log('⏰ Waiting for auth to complete...');
    
    await Promise.race([
      // Wait for navigation away from loading screen
      page.waitForFunction(() => {
        return !document.body.textContent.includes('Loading LeadFlow');
      }, { timeout: 8000 }),
      
      // Or wait for specific auth completion logs
      page.waitForFunction(() => {
        return window.console && window.console.logs && 
               window.console.logs.some(log => 
                 log.includes('Auth timeout reached') || 
                 log.includes('Redirecting to')
               );
      }, { timeout: 8000 })
    ]);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Authentication completed in ${duration}ms`);
    
    // Check final page state
    const finalUrl = page.url();
    const pageTitle = await page.title();
    
    console.log(`📍 Final URL: ${finalUrl}`);
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Analyze logs for performance insights
    const authLogs = logs.filter(log => 
      log.message.includes('🔥') || 
      log.message.includes('Auth') ||
      log.message.includes('timeout')
    );
    
    console.log('\n📊 Auth Performance Summary:');
    console.log(`- Total time: ${duration}ms`);
    console.log(`- Auth-related logs: ${authLogs.length}`);
    
    if (duration < 3000) {
      console.log('🎉 EXCELLENT: Auth completed under 3 seconds');
    } else if (duration < 5000) {
      console.log('✅ GOOD: Auth completed under 5 seconds');
    } else {
      console.log('⚠️ SLOW: Auth took over 5 seconds');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Still capture what we can
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⏱️ Test ran for ${duration}ms before failing`);
  }
  
  await browser.close();
  console.log('🏁 Test completed');
}

// Run the test
testAuthPerformance().catch(console.error);
