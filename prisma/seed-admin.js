/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  const email = 'admin@test.com'
  const password = 'password123'
  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.upsert({
    where: { email },
    update: {
      isAdmin: true
    },
    create: {
      name: 'Admin Tester',
      email: email,
      password: hashedPassword,
      isAdmin: true
    }
  })
  console.log('Admin account ready.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
