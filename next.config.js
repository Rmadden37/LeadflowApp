const path = require('path');
const webpack = require('webpack');

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ['!noprecache/**/*'],
});

// Bundle analyzer - only load if available (optional dependency for CI)
let withBundleAnalyzer = (config) => config;
try {
  withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
  });
} catch (error) {
  console.log('Bundle analyzer not available, skipping...');
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase App Hosting Configuration
  output: 'standalone',
  distDir: ".next",
  
  // Environment variables for App Hosting
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: 'false',
    NEXT_PUBLIC_DEPLOY_TARGET: 'app-hosting',
  },
  
  images: {
    domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com'],
  },
  
  trailingSlash: false,
  
  // Turbo configuration for development
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // TypeScript and ESLint configuration
  typescript: {
    // Only ignore build errors in CI or when explicitly set
    ignoreBuildErrors: process.env.CI === 'true' || process.env.IGNORE_TS_ERRORS === 'true',
  },
  eslint: {
    // Only ignore during builds in CI or when explicitly set
    ignoreDuringBuilds: process.env.CI === 'true' || process.env.IGNORE_ESLINT_ERRORS === 'true',
  },
  
  // Experimental features
  experimental: {
    esmExternals: false,
  },
  
  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // CRITICAL: Path alias configuration with comprehensive resolution
    const srcPath = path.resolve(__dirname, 'src');
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': srcPath,
      '@/components': path.resolve(srcPath, 'components'),
      '@/hooks': path.resolve(srcPath, 'hooks'),
      '@/lib': path.resolve(srcPath, 'lib'),
      '@/app': path.resolve(srcPath, 'app'),
      '@/utils': path.resolve(srcPath, 'utils'),
      '@/types': path.resolve(srcPath, 'types'),
      '@/styles': path.resolve(srcPath, 'styles'),
    };

    // Debug logging in CI environment
    if (process.env.CI) {
      console.log('🔧 CI Environment detected');
      console.log('📁 __dirname:', __dirname);
      console.log('📁 srcPath:', srcPath);
      console.log('🔗 Alias configured:', config.resolve.alias);
    }

    // Exclude functions directory from webpack compilation
    config.externals = config.externals || [];
    
    if (!isServer) {
      // Complete Node.js polyfills for browser environment
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

      // Add webpack plugins for Node.js polyfills
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }

    // Enhanced module resolution
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    config.resolve.modules = ['node_modules', path.resolve(__dirname, 'src')];

    // SVG handling configuration
    const fileLoaderRule = config.module.rules.find(
      (rule) => rule.test?.test?.('.svg')
    );

    if (fileLoaderRule) {
      config.module.rules.push(
        {
          ...fileLoaderRule,
          test: /\.svg$/i,
          resourceQuery: /url/, // *.svg?url
        },
        {
          test: /\.svg$/i,
          issuer: fileLoaderRule.issuer,
          resourceQuery: { not: [...(fileLoaderRule.resourceQuery?.not || []), /url/] },
          use: ['@svgr/webpack'],
        }
      );
      
      // Exclude SVG files from the default file loader
      fileLoaderRule.exclude = /\.svg$/i;
    }
    
    return config;
  },
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));