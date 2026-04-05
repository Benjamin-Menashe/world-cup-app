import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { getDictionary, getLanguage } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";

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
  const dict = await getDictionary();
  const lang = await getLanguage();
  let isAdmin = false;

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.isAdmin) isAdmin = true;
  }

  return (
    <html lang={lang} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <body className={inter.className}>
        <nav className="navbar">
          <Link href="/" style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>⚽</span>
            <span className="brand-text">{dict.brand.worldCup} <span style={{ color: 'var(--red)' }}>{dict.brand.betWithFriends}</span></span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
            <LanguageToggle currentLang={lang} />
            <MobileNav userId={userId} isAdmin={isAdmin} logoutAction={logoutAction} dict={dict.nav} />
          </div>
        </nav>

        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
