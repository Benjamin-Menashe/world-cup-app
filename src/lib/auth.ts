import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-replace-in-production'

export async function signToken(userId: string, isAdmin: boolean = false) {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn: '7d' })
}

export async function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; isAdmin?: boolean }
  } catch {
    return null
  }
}

export type Session = { userId: string; isAdmin: boolean }

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  
  if (!token) return null
  
  const decoded = await verifyToken(token)
  return decoded ? { userId: decoded.userId, isAdmin: decoded.isAdmin ?? false } : null
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
}
