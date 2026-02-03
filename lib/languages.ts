/**
 * Language code to human-readable name mapping
 * Uses ISO 639-1 codes
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  // Common languages in US immigrant/refugee communities
  es: 'Spanish',
  so: 'Somali',
  ar: 'Arabic',
  zh: 'Chinese',
  vi: 'Vietnamese',
  hmn: 'Hmong',
  ko: 'Korean',
  ru: 'Russian',
  fr: 'French',
  ht: 'Haitian Creole',
  tl: 'Tagalog',
  hi: 'Hindi',
  ur: 'Urdu',
  pl: 'Polish',
  bn: 'Bengali',
  pa: 'Punjabi',
  fa: 'Persian',
  am: 'Amharic',
  sw: 'Swahili',
  pt: 'Portuguese',
  ja: 'Japanese',
  th: 'Thai',
  km: 'Khmer',
  my: 'Burmese',
  ne: 'Nepali',
  uk: 'Ukrainian',
  de: 'German',
  it: 'Italian',
  ro: 'Romanian',
  tr: 'Turkish',
  en: 'English'
};

/**
 * Get human-readable language name from ISO 639-1 code
 * Falls back to uppercase code if not found
 */
export function getLanguageName(code: string | null | undefined): string {
  if (!code) return 'Unknown';
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}
