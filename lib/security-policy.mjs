/**
 * Security headers shared by next.config.mjs and proxy.ts.
 *
 * The CSP is built per request because Next.js injects inline bootstrap
 * scripts. A nonce (plus 'strict-dynamic') lets those scripts run without
 * 'unsafe-eval' and without treating every inline script as trusted.
 * script-src does not include 'unsafe-inline'. 'unsafe-eval' is added only
 * in development, where React's error overlay uses eval. Production does not.
 *
 * style-src keeps 'unsafe-inline' and does NOT include a nonce. React style
 * attributes (framer-motion, chart/3D layout) cannot carry a nonce, and a
 * nonce or hash in style-src disables 'unsafe-inline' for the whole
 * directive, which would block those attributes. TradingView's loader also
 * writes a <style> element and element.style on the parent page.
 */

export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=(self)',
  'camera=()',
  'clipboard-read=()',
  // Presale address copy uses navigator.clipboard.writeText.
  'clipboard-write=(self)',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ')

export const STATIC_SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: PERMISSIONS_POLICY },
  // Two years. Browsers honor this only on HTTPS responses.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

/**
 * @param {{ nonce: string, isDev: boolean, upgradeInsecure?: boolean }} options
 */
export function contentSecurityPolicy({ nonce, isDev, upgradeInsecure = false }) {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Fallback hosts for browsers that ignore 'strict-dynamic'.
    // CSP3 browsers trust these only when the tag carries the nonce,
    // or when a nonce-trusted script inserts them.
    'https://s3.tradingview.com',
    'https://va.vercel-scripts.com',
    isDev ? "'unsafe-eval'" : '',
  ]
    .filter(Boolean)
    .join(' ')

  const connectSrc = [
    "'self'",
    // Client market data. BSC RPC (bsc-dataseed*.binance.org, defibit, ninicoin)
    // and https://data-api.binance.vision are fetched only on the server
    // (app/api/presale, app/api/tickers), so they are not browser connect targets.
    'https://www.okx.com',
    'wss://ws.okx.com:8443',
    'wss://data-stream.binance.vision',
    // @vercel/analytics beacon. The script itself is /_vercel/insights/script.js
    // ('self') or https://va.vercel-scripts.com in debug mode.
    'https://vitals.vercel-insights.com',
  ].join(' ')

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // No nonce here, on purpose. See the file comment.
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "img-src 'self' blob: data: https://images.unsplash.com https://cdn.jsdelivr.net",
    // next/font self-hosts Anton SC, Noto Sans SC, and Space Mono.
    // Bootstrap Icons (app/layout.tsx) loads woff/woff2 from jsDelivr.
    "font-src 'self' https://cdn.jsdelivr.net",
    // /videos/hero.mp4 is same-origin. The other reels are on CloudFront.
    "media-src 'self' https://d8j0ntlcm91z4.cloudfront.net",
    `connect-src ${connectSrc}`,
    "frame-src https://s.tradingview.com https://www.tradingview.com https://www.tradingview-widget.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "script-src-attr 'none'",
  ]

  // Only on HTTPS. On an http origin (local `next start`) this directive
  // rewrites same-origin assets to https and the page fails to load.
  if (upgradeInsecure) directives.push('upgrade-insecure-requests')

  return directives.join('; ')
}
