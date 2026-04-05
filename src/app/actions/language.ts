"use server"

import { cookies } from 'next/headers';
import { Language } from '@/lib/i18n';

export async function setLanguageAction(lang: Language) {
  const cookieStore = await cookies();
  cookieStore.set('lang', lang, { maxAge: 60 * 60 * 24 * 365, path: '/' });
}
