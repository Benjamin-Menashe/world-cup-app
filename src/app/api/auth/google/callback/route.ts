import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { signToken, setSessionCookie } from "@/lib/auth"

interface GoogleTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  id_token?: string
}

interface GoogleUserInfo {
  sub: string        // Google's unique user ID
  email: string
  name: string
  picture?: string
  email_verified?: boolean
}

/**
 * GET /api/auth/google/callback
 * 
 * Handles the OAuth callback from Google.
 * Exchanges the authorization code for tokens, fetches user profile,
 * then finds or creates the user with account linking.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const stateRaw = req.nextUrl.searchParams.get("state")
  const error = req.nextUrl.searchParams.get("error")

  // User denied consent or something went wrong
  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=google_denied", req.url))
  }

  // Parse invite code from state
  let inviteCode = ""
  if (stateRaw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateRaw))
      inviteCode = parsed.inviteCode || ""
    } catch {
      // Invalid state, ignore
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google/callback`

  // 1. Exchange authorization code for access token
  let tokenData: GoogleTokenResponse
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error("Google token exchange failed:", errBody)
      return NextResponse.redirect(new URL("/login?error=google_token_failed", req.url))
    }

    tokenData = await tokenRes.json()
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_network_error", req.url))
  }

  // 2. Fetch user profile from Google
  let googleUser: GoogleUserInfo
  try {
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userRes.ok) {
      return NextResponse.redirect(new URL("/login?error=google_profile_failed", req.url))
    }

    googleUser = await userRes.json()
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_network_error", req.url))
  }

  if (!googleUser.email) {
    return NextResponse.redirect(new URL("/login?error=google_no_email", req.url))
  }

  // 3. Find or create the user (with account linking)
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { googleId: googleUser.sub },
        { email: googleUser.email },
      ],
    },
  })

  if (user) {
    // Link Google account if not already linked
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.sub },
      })
    }
  } else {
    // Create new user (no password — Google-only account)
    user = await prisma.user.create({
      data: {
        name: googleUser.name || googleUser.email.split("@")[0],
        email: googleUser.email,
        googleId: googleUser.sub,
      },
    })

    // Auto-join invite group if provided
    if (inviteCode) {
      const group = await prisma.group.findUnique({ where: { inviteCode } })
      if (group) {
        await prisma.member.create({
          data: { userId: user.id, groupId: group.id },
        })
      }
    }
  }

  // 4. Issue JWT session cookie and redirect home
  const token = await signToken(user.id)
  await setSessionCookie(token)

  return NextResponse.redirect(new URL("/", req.url))
}
