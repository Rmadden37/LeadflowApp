#!/bin/bash

# Debug Build Script - Test CI build locally
# This script simulates the CI environment for testing

set -e  # Exit on any error

echo "🧪 Starting DEBUG build to simulate CI environment..."

# Set CI environment variables
export NODE_ENV=production
export CI=true
export NEXT_PUBLIC_DEPLOY_TARGET=app-hosting
export NEXT_PUBLIC_STATIC_EXPORT=false

echo "🧹 Cleaning previous builds..."
rm -rf .next out dist

echo "📝 Current directory structure:"
echo "  - package.json exists: $([ -f "package.json" ] && echo "✅" || echo "❌")"
echo "  - tsconfig.json exists: $([ -f "tsconfig.json" ] && echo "✅" || echo "❌")"
echo "  - next.config.js exists: $([ -f "next.config.js" ] && echo "✅" || echo "❌")"
echo "  - src directory exists: $([ -d "src" ] && echo "✅" || echo "❌")"

echo "🔍 Checking src directory structure:"
if [ -d "src" ]; then
    echo "  - src/app: $([ -d "src/app" ] && echo "✅" || echo "❌")"
    echo "  - src/components: $([ -d "src/components" ] && echo "✅" || echo "❌")"
    echo "  - src/hooks: $([ -d "src/hooks" ] && echo "✅" || echo "❌")"
    echo "  - src/lib: $([ -d "src/lib" ] && echo "✅" || echo "❌")"
fi

echo "🔧 Testing module resolution..."
echo "Current working directory: $(pwd)"
echo "Absolute src path: $(readlink -f src 2>/dev/null || echo "$(pwd)/src")"

# Test if critical files exist
CRITICAL_FILES=(
    "src/hooks/use-auth.ts"
    "src/hooks/use-auth.tsx"
    "src/hooks/use-toast.ts"
    "src/hooks/use-toast.tsx"
    "src/lib/firebase.ts"
    "src/lib/firebase.js"
)

echo "🔍 Checking for critical import files:"
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done

echo "📦 Installing dependencies..."
npm ci

echo "🔧 Testing Next.js build with CI configuration..."

# Create temporary CI configs (same as ci-build.sh)
if [ -f "tsconfig.json" ]; then
    cp tsconfig.json tsconfig.json.debug-backup
fi

if [ -f "next.config.js" ]; then
    cp next.config.js next.config.js.debug-backup
fi

# Create CI-specific tsconfig
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "allowSyntheticDefaultImports": true,
    "downlevelIteration": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "plugins": [{ "name": "next" }],
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noImplicitReturns": false,
    "noFallthroughCasesInSwitch": false,
    "forceConsistentCasingInFileNames": false,
    "noImplicitAny": false,
    "noImplicitThis": false
  },
  "include": [
    ".next/types/**/*.ts",
    "next-env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "functions/**/*",
    ".next",
    "out"
  ]
}
EOF

# Create CI-specific Next.js config
cat > next.config.js << 'EOF'
const path = require('path');
const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: ".next",
  
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: 'false',
    NEXT_PUBLIC_DEPLOY_TARGET: 'app-hosting',
  },
  
  images: {
    domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com'],
  },
  
  trailingSlash: false,
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  experimental: {
    esmExternals: false,
  },
  
  webpack: (config, { isServer, webpack }) => {
    const srcPath = path.resolve(__dirname, 'src');
    
    console.log('🔧 DEBUG Webpack Configuration:');
    console.log('📁 __dirname:', __dirname);
    console.log('📁 srcPath:', srcPath);
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': srcPath,
      '@/components': path.resolve(srcPath, 'components'),
      '@/hooks': path.resolve(srcPath, 'hooks'),
      '@/lib': path.resolve(srcPath, 'lib'),
      '@/app': path.resolve(srcPath, 'app'),
      '@/utils': path.resolve(srcPath, 'utils'),
    };

    console.log('🔗 Final aliases:', config.resolve.alias);

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        os: false,
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }

    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    
    return config;
  },
};

module.exports = nextConfig;
EOF

echo "🔨 Running Next.js build..."
npm run build

# Check build results
echo "🔍 Build verification:"
echo "  - .next directory: $([ -d ".next" ] && echo "✅" || echo "❌")"
echo "  - Standalone build: $([ -f ".next/standalone/server.js" ] && echo "✅" || echo "❌")"
echo "  - Static files: $([ -d ".next/static" ] && echo "✅" || echo "❌")"

# Restore original configs
if [ -f "tsconfig.json.debug-backup" ]; then
    mv tsconfig.json.debug-backup tsconfig.json
    echo "📝 Restored original tsconfig.json"
fi

if [ -f "next.config.js.debug-backup" ]; then
    mv next.config.js.debug-backup next.config.js
    echo "📝 Restored original next.config.js"
fi

if [ -d ".next" ]; then
    echo "✅ DEBUG build completed successfully!"
    echo "🎉 Your app should deploy successfully to Firebase App Hosting"
else
    echo "❌ DEBUG build failed"
    exit 1
fi