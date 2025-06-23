/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static route debugger and other development overlays
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: "bottom-right",
  },
}

module.exports = nextConfig 