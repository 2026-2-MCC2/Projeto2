const SECURE_HEADERS = {
  Server: 'undisclosed',
  'Strict-Transport-Security': 'max-age=63072000; includeSubdomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer, strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'",
}

export class SecureHeaders {
  processRequest(req, res) {
    res.set(SECURE_HEADERS)
  }
}
