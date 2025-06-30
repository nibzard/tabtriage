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
  serverExternalPackages: ['@xenova/transformers'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        '@xenova/transformers': 'commonjs @xenova/transformers'
      });
    }

    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader',
    });

    // Ignore onnxruntime-node on the client side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        'onnxruntime-node': false,
      };
    }

    return config;
  },
}

module.exports = nextConfig