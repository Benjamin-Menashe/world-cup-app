"use server"

import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { signToken, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) return { error: "Missing fields" }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return { error: "Invalid credentials" }

  // Google-only account — no password set
  if (!user.password) {
    return { error: "This account uses Google sign-in. Please click the \"Sign in with Google\" button below." }
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) return { error: "Invalid credentials" }

  const token = await signToken(user.id)
  await setSessionCookie(token)
  
  redirect("/")
}

export async function registerAction(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const inviteCode = formData.get("inviteCode") as string | null

  if (!name || !email || !password) return { error: "Missing fields" }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "Email already exists" }

  const hashedPassword = await bcrypt.hash(password, 10)
  
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword }
  })

  if (inviteCode) {
    const group = await prisma.group.findUnique({ where: { inviteCode } })
    if (group) {
      await prisma.member.create({
        data: { userId: user.id, groupId: group.id }
      })
    }
  }

  const token = await signToken(user.id)
  await setSessionCookie(token)

  redirect("/")
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect("/login")
}

export async function deleteAccountAction() {
  const userId = await getSession()
  if (!userId) return { error: "Not authenticated" }

  try {
    await prisma.user.delete({ where: { id: userId } })
  } catch {
    return { error: "Failed to delete account" }
  }

  await clearSessionCookie()
  redirect("/register")
}

export async function updateNicknameAction(name: string) {
  const userId = await getSession()
  if (!userId) return { error: "Not authenticated" }

  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2) return { error: "Name must be at least 2 characters" }
  if (trimmed.length > 30) return { error: "Name must be 30 characters or fewer" }

  try {
    await prisma.user.update({ where: { id: userId }, data: { name: trimmed } })
  } catch {
    return { error: "Failed to update nickname" }
  }
}
