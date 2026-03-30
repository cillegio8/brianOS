/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages compatibility
  trailingSlash: true,
}

module.exports = nextConfig
