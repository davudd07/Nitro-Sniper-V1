/** Case catalog text search (solo + battle pickers). Matches display name. */
export function matchesCaseName(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q);
}
