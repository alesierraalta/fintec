/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: 'output: export' removed - using Capacitor in server mode
  // Capacitor will wrap the deployed web app URL instead of static files
  images: {
    
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
