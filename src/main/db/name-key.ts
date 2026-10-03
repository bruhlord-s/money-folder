/** Locale-independent Unicode case folding for unique name columns ("Мама" and "мама" collide). */
export function nameKey(name: string): string {
  return name.trim().toLowerCase()
}
