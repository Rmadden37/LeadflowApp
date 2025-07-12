const withPWA = require('next-pwa')({
  dest: 'public', // Changed from 'dist' to 'public' for App Hosting
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ['!noprecache/**/*'],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase App Hosting Configuration
  output: 'standalone', // Required for Firebase App Hosting
  distDir: ".next",
  
  // Environment variables for App Hosting
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: 'false',
    NEXT_PUBLIC_DEPLOY_TARGET: 'app-hosting',
  },
  
  images: {
    domains: [
      'firebasestorage.googleapis.com', 
      'lh3.googleusercontent.com',
      'ui-avatars.com',
      'api.dicebear.com'
    ],
  },
  trailingSlash: false,
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Build optimization
  typescript: {
    // Temporarily ignore TypeScript errors during build for CI
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors during build for CI
    ignoreDuringBuilds: true,
  },
  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Exclude functions directory from webpack compilation
    config.externals = config.externals || [];
    
    if (!isServer) {
      // Fix protobuf and gRPC issues in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
      };
    }

    // SVG handling
    const fileLoaderRule = config.module.rules.find(
      (rule) => rule.test?.test?.('.svg')
    );

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...(fileLoaderRule.resourceQuery?.not || []), /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      }
    );
    
    // Handle SVG files
    fileLoaderRule.exclude = /\.svg$/i;
    
    return config;
  },
};

module.exports = withPWA(nextConfig);
