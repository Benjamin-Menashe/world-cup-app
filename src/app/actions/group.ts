"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export async function createGroupAction(formData: FormData) {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const name = formData.get("name") as string
  if (!name) return { error: "Group name is required" }

  let inviteCode = ""
  let isUnique = false
  while (!isUnique) {
    inviteCode = generateInviteCode()
    const existing = await prisma.group.findUnique({ where: { inviteCode } })
    if (!existing) isUnique = true
  }

  const group = await prisma.group.create({
    data: {
      name,
      inviteCode,
      members: {
        create: { userId }
      }
    }
  })

  redirect(`/group/${group.id}`)
}

export async function joinGroupAction(formData: FormData) {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const inviteCode = (formData.get("inviteCode") as string)?.toUpperCase().trim()
  if (!inviteCode) return { error: "Invite code is required" }

  const group = await prisma.group.findUnique({ where: { inviteCode } })
  if (!group) return { error: "Group not found. Check the invite code." }

  const existing = await prisma.member.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } }
  })
  if (existing) return { error: "You are already in this group." }

  await prisma.member.create({ data: { userId, groupId: group.id } })
  redirect(`/group/${group.id}`)
}

export async function leaveGroupAction(formData: FormData) {
  const userId = await getSession()
  if (!userId) redirect("/login")

  const groupId = formData.get("groupId") as string
  if (!groupId) return

  await prisma.member.deleteMany({ where: { userId, groupId } })
  redirect("/group")
}
