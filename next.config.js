const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ['!noprecache/**/*'],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Firebase App Hosting configuration (dynamic Next.js app)
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
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
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
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        http2: false,
        '@protobufjs/codegen': false,
        '@protobufjs/fetch': false,
        '@protobufjs/path': false,
        '@protobufjs/pool': false,
        '@protobufjs/utf8': false,
        '@protobufjs/inquire': false,
        '@protobufjs/aspromise': false,
        '@protobufjs/base64': false,
        '@protobufjs/eventemitter': false,
        '@protobufjs/float': false,
        'protobufjs/minimal': false,
        '@grpc/grpc-js': false,
        '@grpc/proto-loader': false,
      };
    }
    
    // Ignore problematic modules completely
    if (isServer) {
      config.externals.push(
        '@grpc/grpc-js',
        '@grpc/proto-loader',
        'protobufjs'
      );
    }

    // Fix OpenTelemetry warnings by adding missing optional dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/exporter-jaeger': false,
      '@opentelemetry/exporter-zipkin': false,
      '@opentelemetry/exporter-collector': false,
    };

    // Ignore handlebars warnings in webpack
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Handle handlebars require.extensions warnings
    config.module.rules.push({
      test: /node_modules\/handlebars\/lib\/index\.js$/,
      use: {
        loader: 'string-replace-loader',
        options: {
          search: 'require.extensions',
          replace: '(typeof require !== "undefined" && require.extensions)',
          flags: 'g'
        }
      }
    });

    // Suppress specific webpack warnings for optional dependencies
    config.ignoreWarnings = [
      /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
      /Module not found: Can't resolve '@opentelemetry\/exporter-zipkin'/,
      /Module not found: Can't resolve '@opentelemetry\/exporter-collector'/,
      /require\.extensions is not supported by webpack/,
      /Critical dependency: the request of a dependency is an expression/,
    ];

    // Add NormalModuleReplacementPlugin to handle optional dependencies
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@opentelemetry\/exporter-jaeger/,
        'data:text/javascript,module.exports = {}'
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@opentelemetry\/exporter-zipkin/,
        'data:text/javascript,module.exports = {}'
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@opentelemetry\/exporter-collector/,
        'data:text/javascript,module.exports = {}'
      )
    );
    
    return config;
  },
  // Enhanced image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/leadflow-4lvrr.firebasestorage.app/o/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24, // 1 day
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Output configuration for Firebase
  output: 'standalone',
  trailingSlash: false,
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = withPWA(nextConfig);
