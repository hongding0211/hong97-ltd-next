/** @type {import('next').NextConfig} */
export const devNextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3500/:path*',
      },
    ]
  },
}
