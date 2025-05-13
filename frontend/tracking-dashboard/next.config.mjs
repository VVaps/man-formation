/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    // Prevent HTML fallback for API routes
    experimental: {
        outputFileTracingIgnores: ['**cache/**'],
        async rewrites() {
            return [
                {
                    source: '/api/:path*',
                    destination: '/api/:path*',
                },
            ]
        }
    }
};

export default nextConfig;
