export type PriceInfo =
  | { kind: 'free'; label: string }
  | { kind: 'amount'; label: string }
  | { kind: 'varies'; label: string }
  | null;

/**
 * Turns a scraped or hand-entered price label into what the event card shows.
 * - "Free" / "Grátis"            → { kind: 'free', label: 'Free' }
 * - "€15.00", "15€", "From €10" → { kind: 'amount', label: '€15' | 'From €10' }
 * - "Varies…", "Check ticket price on event" → { kind: 'varies', label: 'Paid · see site' }
 * - empty, "TBD", "N/A"          → null (no price shown, normal Register button)
 */
export function priceInfo(raw: string | null | undefined): PriceInfo {
  const text = (raw ?? '').trim();
  if (!text || /^(tbd|tba|n\/?a|unknown|-+)$/i.test(text)) return null;
  if (/\b(free|gr[aá]tis|gratuit[oa])\b/i.test(text)) return { kind: 'free', label: 'Free' };

  const hasAmount = /(€|eur\b)\s*\d|\d+(?:[.,]\d+)?\s*(€|eur\b)/i.test(text);
  if (hasAmount) {
    const label = text
      .replace(/(\d+(?:[.,]\d+)?)\s*(?:€|eur\b)/gi, '€$1') // 15€ → €15
      .replace(/\beur\s*(\d)/gi, '€$1')
      .replace(/€\s+/g, '€')
      .replace(/(\d)[.,]00\b/g, '$1') // €15.00 → €15
      .replace(/^from\b/i, 'From');
    return { kind: 'amount', label };
  }

  if (/(varies|vary|check|paid|ticket|price|see)/i.test(text)) return { kind: 'varies', label: 'Paid · see site' };
  return null;
}

/** True when the event needs an external ticket purchase. */
export const isPaid = (info: PriceInfo) => info?.kind === 'amount' || info?.kind === 'varies';
