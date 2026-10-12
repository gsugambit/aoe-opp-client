// Preload all civilization flag images from assets via Vite's glob import
const flagImages = import.meta.glob('../../assets/flags/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Common aliases/normalizations for AOE4 civ names
const CIV_ALIASES: Record<string, string[]> = {
  'holy-roman-empire': ['hre', 'holy_roman_empire', 'holyromanempire'],
  'abbasid-dynasty': ['abbasid', 'abbasid_dynasty'],
  'delhi-sultanate': ['delhi', 'delhi_sultanate'],
  'ottomans': ['ottoman'],
  'sengoku-daimyo': ['sengoku_daimyo'],
  'order-of-the-dragon': ['order_of_the_dragon'],
  'zhu-xi-s-legacy': ['zhu_xis_legacy', 'zhu_xi_s_legacy'],
};

export const formatCivName = (civ?: string): string => {
  if (!civ) return 'Unknown Civ';
  return civ
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const DEFAULT_CIVILIZATIONS = [
  'abbasid_dynasty',
  'ayyubids',
  'byzantines',
  'chinese',
  'delhi_sultanate',
  'english',
  'french',
  'golden_horde',
  'holy_roman_empire',
  'house_of_lancaster',
  'japanese',
  'jeanne_darc',
  'knights_templar',
  'macedonian_dynasty',
  'malians',
  'mongols',
  'order_of_the_dragon',
  'ottomans',
  'rus',
  'sengoku_daimyo',
  'tughlaq_dynasty',
  'zhu_xis_legacy',
];

export const getFlagUrl = (civilization: string | undefined): string | undefined => {
  if (!civilization) return undefined;
  const slug = toSlug(civilization);
  const underscoreSlug = slug.replace(/-/g, '_');
  const candidates = [slug, underscoreSlug, ...(CIV_ALIASES[slug] ?? [])];

  // Try to find an image whose base filename matches one of the candidates
  for (const [path, url] of Object.entries(flagImages)) {
    const filename = path.split('/').pop() || '';
    const base = filename.substring(0, filename.lastIndexOf('.')).toLowerCase();
    if (candidates.includes(base)) return url;
  }
  return undefined;
};
