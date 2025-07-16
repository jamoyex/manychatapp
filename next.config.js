/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static route debugger and other development overlays
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: "bottom-right",
  },
  // Configure allowed image domains for Next.js Image component
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bucket.botbuilders.cloud',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig 