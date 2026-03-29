import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

import { getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import prisma from "@/lib/prisma";
import MobileNav from "@/components/MobileNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "World Cup 2026 Bet with friends!",
  description: "Social betting app for the 2026 World Cup",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await getSession();
  let isAdmin = false;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.isAdmin) isAdmin = true;
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="navbar">
          <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>⚽</span>
            <span className="brand-text">World Cup 2026 <span style={{ color: 'var(--red)' }}>Bet with friends!</span></span>
          </Link>
          <MobileNav userId={userId} isAdmin={isAdmin} logoutAction={logoutAction} />
        </nav>

        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
