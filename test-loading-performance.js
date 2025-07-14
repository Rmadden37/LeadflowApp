#!/usr/bin/env node

// Simple loading performance test without puppeteer
// This just checks if the server is responding and measures response time

const http = require('http');
const url = require('url');

async function testLoadingPerformance() {
  console.log('🧪 Testing loading performance...\n');
  
  const testUrl = 'http://localhost:9003';
  
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const req = http.get(testUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`✅ Server Response Time: ${responseTime}ms`);
        console.log(`📊 Status Code: ${res.statusCode}`);
        
        // Check if our loading page is being served
        if (data.includes('Loading LeadFlow')) {
          console.log('✅ Loading page is being served correctly');
        } else {
          console.log('❌ Loading page content not found');
        }
        
        // Check if our debug elements are present
        if (data.includes('Debug Info')) {
          console.log('✅ Debug mode elements are present');
        }
        
        // Check if emergency actions are available
        if (data.includes('Force Refresh')) {
          console.log('✅ Emergency actions are available');
        }
        
        resolve({
          responseTime,
          statusCode: res.statusCode,
          hasLoadingContent: data.includes('Loading LeadFlow'),
          hasDebugMode: data.includes('Debug Info'),
          hasEmergencyActions: data.includes('Force Refresh')
        });
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.error('❌ Request timed out after 5 seconds');
      req.abort();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkAuthPerformance() {
  console.log('\n🔍 Checking authentication optimizations...\n');
  
  // Check if our auth hook has the right timeouts
  const fs = require('fs');
  const path = require('path');
  
  try {
    const authHookPath = path.join(__dirname, 'src/hooks/use-auth.tsx');
    const authContent = fs.readFileSync(authHookPath, 'utf8');
    
    if (authContent.includes('3000')) {
      console.log('✅ 3-second auth timeout is configured');
    }
    
    if (authContent.includes('setPersistence')) {
      console.log('✅ Firebase auth persistence is configured');
    } else {
      console.log('⚠️ Firebase auth persistence not found');
    }
    
    if (authContent.includes('onAuthStateChanged')) {
      console.log('✅ Firebase auth state listener is configured');
    }
    
    // Check main page has emergency timeout
    const mainPagePath = path.join(__dirname, 'src/app/page.tsx');
    const pageContent = fs.readFileSync(mainPagePath, 'utf8');
    
    if (pageContent.includes('4000')) {
      console.log('✅ 4-second emergency timeout is configured');
    }
    
    if (pageContent.includes('emergencyTimeout')) {
      console.log('✅ Emergency navigation is configured');
    }
    
  } catch (error) {
    console.error('❌ Error checking auth files:', error.message);
  }
}

async function main() {
  console.log('🚀 LeadFlow Loading Performance Test\n');
  console.log('=====================================\n');
  
  try {
    await checkAuthPerformance();
    const result = await testLoadingPerformance();
    
    console.log('\n📋 Summary:');
    console.log('===========');
    console.log(`Response Time: ${result.responseTime}ms`);
    console.log(`Status: ${result.statusCode === 200 ? 'OK' : 'ERROR'}`);
    console.log(`Loading Content: ${result.hasLoadingContent ? 'Present' : 'Missing'}`);
    
    if (result.responseTime < 1000) {
      console.log('\n🎉 Great! Server response is fast');
    } else if (result.responseTime < 2000) {
      console.log('\n⚠️ Server response is acceptable but could be faster');
    } else {
      console.log('\n❌ Server response is slow');
    }
    
    console.log('\n💡 Next steps:');
    console.log('- Open http://localhost:9003 in your browser');
    console.log('- Check browser console for auth debug logs');
    console.log('- Loading should complete within 3-4 seconds max');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
