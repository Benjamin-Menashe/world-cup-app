import { cookies } from 'next/headers';
import en from './en.json';
import he from './he.json';

export type Language = 'en' | 'he';
export type Dictionary = typeof en;

export const dictionaries = {
  en,
  he
};

export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  const lang = cookieStore.get('lang')?.value as Language;
  return dictionaries[lang] ? lang : 'en';
}

export async function getDictionary(): Promise<Dictionary> {
  const lang = await getLanguage();
  return dictionaries[lang];
}
