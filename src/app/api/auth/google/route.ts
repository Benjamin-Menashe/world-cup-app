import { NextRequest, NextResponse } from "next/server"

/**
 * GET /api/auth/google
 * 
 * Redirects the user to Google's OAuth consent screen.
 * Accepts an optional ?inviteCode=XXX query param to preserve
 * invite codes through the OAuth flow.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 })
  }

  // Determine the base URL for the redirect URI
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google/callback`

  // Preserve invite code through the OAuth flow via the state parameter
  const inviteCode = req.nextUrl.searchParams.get("inviteCode") || ""
  const state = JSON.stringify({ inviteCode })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
    state: encodeURIComponent(state),
  })

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  return NextResponse.redirect(googleAuthUrl)
}
