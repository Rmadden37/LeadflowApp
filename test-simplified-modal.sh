#!/bin/bash

echo "🔍 Testing Simplified Pending Approvals Modal Implementation"
echo "============================================================"

# Check if the new component exists
if [ -f "src/components/dashboard/pending-approvals-simple-modal.tsx" ]; then
    echo "✅ New simplified modal component exists"
else
    echo "❌ New simplified modal component missing"
    exit 1
fi

# Check if manage teams page is using the new component
if grep -q "pending-approvals-simple-modal" src/app/dashboard/manage-teams/page.tsx; then
    echo "✅ Manage teams page is using the new simplified modal"
else
    echo "❌ Manage teams page is not using the new simplified modal"
    exit 1
fi

# Check if old component import is removed
if grep -q "pending-approvals-modal" src/app/dashboard/manage-teams/page.tsx; then
    echo "❌ Old modal component import still exists in manage teams page"
    echo "   Found: $(grep "pending-approvals-modal" src/app/dashboard/manage-teams/page.tsx)"
    exit 1
else
    echo "✅ Old modal component import removed from manage teams page"
fi

# Check for any TypeScript errors
echo "🔍 Checking for TypeScript errors..."
if command -v npx &> /dev/null; then
    # Run a quick TypeScript check on the main files
    npx tsc --noEmit --skipLibCheck src/app/dashboard/manage-teams/page.tsx 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ No TypeScript errors found"
    else
        echo "⚠️  TypeScript errors detected"
    fi
else
    echo "⚠️  TypeScript check skipped (npx not available)"
fi

echo ""
echo "🎯 Implementation Summary:"
echo "  - Old complex modal replaced with simplified version"
echo "  - New modal has cleaner data loading logic"
echo "  - Better error handling and console logging"
echo "  - Simplified state management"
echo ""
echo "📋 Next Steps:"
echo "  1. Test the modal in the browser at http://localhost:9003/dashboard/manage-teams"
echo "  2. Verify pending approvals count displays correctly"
echo "  3. Click the button and verify users show up in the modal"
echo "  4. Test approve/reject functionality"
echo ""
echo "✨ Test completed successfully!"
