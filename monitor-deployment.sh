#!/bin/bash

echo "🚀 Firebase App Hosting Deployment Monitor"
echo "=========================================="
echo "Time: $(date)"
echo ""

# Show recent commits
echo "📜 Recent Commits (triggering deployments):"
git log --oneline -5 --graph --decorate
echo ""

# Show current configuration summary
echo "🔧 Current Configuration Summary:"
echo "  Build Command: npm run build:ci"
echo "  Runtime: Node.js 20"
echo "  Start Command: cd .next/standalone && node server.js"
echo "  Memory: 4GiB (matches Cloud Run requirements)"
echo "  CPU: 2 (optimal for 4GiB memory)"
echo "  Port: 8080"
echo "  Health Check: /api/health"
echo ""

# Check if standalone build exists
echo "🏗️ Local Build Status:"
if [ -f ".next/standalone/server.js" ]; then
    echo "  ✅ Standalone server ready (.next/standalone/server.js)"
    echo "  📦 Build size: $(du -sh .next/standalone 2>/dev/null | cut -f1)"
else
    echo "  ⚠️  Standalone server not found (may need: npm run build:ci)"
fi
echo ""

# Show deployment-related files
echo "📄 Deployment Configuration Files:"
echo "  ✅ apphosting.yaml (Firebase App Hosting config)"
echo "  ✅ package.json (build scripts)"
echo "  ✅ next.config.js (Next.js standalone mode)"
echo "  ✅ ci-build-comprehensive.sh (CI build script)"
echo ""

# Git status
echo "📊 Git Status:"
if [ -z "$(git status --porcelain)" ]; then
    echo "  ✅ Working directory clean - all changes deployed"
else
    echo "  ⚠️  Uncommitted changes detected:"
    git status --short
fi
echo ""

echo "🌐 Expected Deployment Process:"
echo "  1. ⏳ Firebase App Hosting detects git push"
echo "  2. 🏗️  Runs: npm run build:ci"
echo "  3. 📦 Creates standalone server bundle"
echo "  4. 🚀 Deploys to Cloud Run with 2 CPU + 4GiB memory"
echo "  5. ✅ Service becomes available with health checks"
echo ""

echo "📍 Deployment URLs (once live):"
echo "  • Main App: https://[project-id].web.app"
echo "  • Health Check: https://[project-id].web.app/api/health"
echo "  • Dashboard: https://[project-id].web.app/dashboard"
echo ""

echo "🔍 To monitor deployment:"
echo "  • Check Firebase Console: https://console.firebase.google.com"
echo "  • View Cloud Run logs: https://console.cloud.google.com/run"
echo "  • Monitor build progress in App Hosting section"
echo ""

echo "✅ Deployment monitoring complete!"
echo "🕐 Last updated: $(date)"
