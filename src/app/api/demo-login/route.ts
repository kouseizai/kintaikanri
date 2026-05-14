import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role') === 'owner' ? 'owner' : 'employee'

  const response = NextResponse.redirect(new URL('/dashboard', request.url))
  response.cookies.set('demo_role', role, {
    path: '/',
    maxAge: 60 * 60 * 24, // 1日
    httpOnly: false,
    sameSite: 'lax',
  })
  return response
}
