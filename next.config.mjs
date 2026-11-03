/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['mysql2', 'bcryptjs'],
  experimental: {serverActions: {bodySizeLimit: '30mb'}},
};
export default nextConfig;
