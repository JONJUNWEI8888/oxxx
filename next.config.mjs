import { STATIC_SECURITY_HEADERS } from './lib/security-policy.mjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    // Content-Security-Policy is set in proxy.ts. It needs a per-request
    // nonce so Next.js can stamp its inline bootstrap scripts; headers()
    // here is static and cannot do that.
    return [
      {
        source: '/(.*)',
        headers: STATIC_SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
