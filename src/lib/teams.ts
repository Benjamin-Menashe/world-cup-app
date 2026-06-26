export function normalizeTeamName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim();
}

export function teamNamesMatch(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  const normA = normalizeTeamName(nameA);
  const normB = normalizeTeamName(nameB);
  
  if (normA === normB) return true;

  // Synonyms mapping
  const synonyms: Record<string, string[]> = {
    "czechia": ["czech republic", "czech"],
    "czech republic": ["czechia", "czech"],
    "usa": ["united states", "united states of america", "us"],
    "united states": ["usa", "united states of america", "us"],
    "south korea": ["korea republic", "korea, south", "korea"],
    "korea republic": ["south korea", "korea, south", "korea"],
    "turkiye": ["turkey"],
    "turkey": ["turkiye"],
    "cape verde": ["cape verde islands"],
    "cape verde islands": ["cape verde"],
    "ivory coast": ["cote d'ivoire", "cote divoire"],
    "cote d'ivoire": ["ivory coast", "cote divoire"],
    "congo dr": ["dr congo", "democratic republic of the congo", "congo, dr"],
    "dr congo": ["congo dr", "democratic republic of the congo", "congo, dr"]
  };

  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const cleanA = clean(normA);
  const cleanB = clean(normB);

  if (cleanA === cleanB) return true;

  // Check synonym arrays
  for (const [key, list] of Object.entries(synonyms)) {
    const cleanKey = clean(key);
    const cleanList = list.map(clean);
    if ((cleanA === cleanKey && cleanList.includes(cleanB)) || (cleanB === cleanKey && cleanList.includes(cleanA))) {
      return true;
    }
  }

  // Fallback: one contains the other if it's long enough
  if (cleanA.length > 3 && cleanB.length > 3) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  }

  return false;
}
