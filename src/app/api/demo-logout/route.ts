import { NextResponse } from 'next/server'

function originFromHeaders(req: Request): string {
  const h = req.headers
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

export async function GET(request: Request) {
  const origin = originFromHeaders(request)
  const response = NextResponse.redirect(`${origin}/login`)
  response.cookies.delete('demo_role')
  return response
}
