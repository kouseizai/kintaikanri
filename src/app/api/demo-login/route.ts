import { NextResponse } from 'next/server'

function originFromHeaders(req: Request): string {
  const h = req.headers
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') === 'owner' ? 'owner' : 'employee'

  const origin = originFromHeaders(request)
  const response = NextResponse.redirect(`${origin}/dashboard`)
  response.cookies.set('demo_role', role, {
    path: '/',
    maxAge: 60 * 60 * 24,
    httpOnly: false,
    sameSite: 'lax',
  })
  return response
}
