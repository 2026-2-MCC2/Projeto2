// Middleware: coloca headers de segurança em todas as respostas.
// Headers são informações extras que vão junto da resposta; estes dizem ao navegador como se
// proteger (ex.: só usar HTTPS, não abrir a página dentro de outro site).

const SECURE_HEADERS = {
  Server: 'undisclosed', // não revela qual servidor é usado
  'Strict-Transport-Security': 'max-age=63072000; includeSubdomains', // navegador só usa HTTPS
  'X-Frame-Options': 'SAMEORIGIN', // impede a página de ser aberta dentro de iframe de outro site
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff', // navegador respeita o Content-Type
  'Referrer-Policy': 'no-referrer, strict-origin-when-cross-origin',
  'Cache-Control': 'no-store', // respostas não ficam em cache
  'Content-Security-Policy': "default-src 'self'",
}

export class SecureHeaders {
  processRequest(req, res) {
    res.set(SECURE_HEADERS)
  }
}
