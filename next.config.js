/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/', destination: '/dashboard', permanent: false },
    ]
  },
  // อนุญาต external images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ratchakitchanubeksa.go.th' },
      { protocol: 'https', hostname: 'www.labour.go.th' },
    ],
  },
}
module.exports = nextConfig
