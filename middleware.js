// Vercel Routing Middleware: runs before static files are served.
//
// getinfold.app is the marketing site (marketing.html). vercel.json rewrites
// every path there, but rewrites only apply when no file matches, and "/"
// always matches the app's index.html. This sends the home page of the
// marketing domain to marketing.html too. Only "/" ever reaches this code.

export const config = { matcher: '/' }

const MARKETING_HOSTS = new Set(['getinfold.app', 'www.getinfold.app'])

export default function middleware(request) {
  const url = new URL(request.url)
  // Anything else (the app's own domains): carry on as normal
  if (!MARKETING_HOSTS.has(url.hostname)) return new Response(null, { headers: { 'x-middleware-next': '1' } })
  return new Response(null, {
    headers: { 'x-middleware-rewrite': new URL('/marketing.html', url).toString() },
  })
}
