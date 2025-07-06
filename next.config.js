/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
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