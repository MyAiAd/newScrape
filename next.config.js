/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    outputFileTracingRoot: undefined,
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-extra']
  },
  webpack: (config) => {
    config.externals.push({
      'puppeteer': 'puppeteer',
      'puppeteer-extra': 'puppeteer-extra'
    });
    return config;
  }
}

module.exports = nextConfig 