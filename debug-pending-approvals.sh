#!/bin/bash

# Debug script to check pending approvals
echo "🔍 DEBUGGING PENDING APPROVALS ISSUE"
echo "======================================="

# First, let's check the dev server status
echo ""
echo "📡 Checking development server..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Development server is running on port 3000"
else
    echo "❌ Development server is NOT running on port 3000"
    echo "Please start the dev server with: npm run dev"
fi

# Check if there are any obvious console errors
echo ""
echo "🚨 Common issues to check:"
echo "1. Open browser dev tools (F12)"
echo "2. Check Console tab for JavaScript errors"
echo "3. Check Network tab for failed API calls"
echo "4. Check Firestore permissions"
echo "5. Verify user role (should be admin or manager)"

echo ""
echo "🔍 Manual verification steps:"
echo "1. Go to /dashboard/manage-teams"
echo "2. Look for 'Pending Approvals' button in top-right"
echo "3. Click the button to open modal"
echo "4. Check browser console for errors"

echo ""
echo "💡 If modal opens but shows no approvals:"
echo "1. Check if there are actually pending users in Firestore"
echo "2. Verify the user has correct permissions"
echo "3. Check team assignment filters"
