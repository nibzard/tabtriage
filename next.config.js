/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['urspivmuqxcebifrtqdm.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'urspivmuqxcebifrtqdm.supabase.co',
      }
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true, // Set to true for both dev and production to ensure images work
  },
}

module.exports = nextConfig