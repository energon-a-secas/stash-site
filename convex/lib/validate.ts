/**
 * Input validation shared by every public mutation.
 * All submission input is untrusted: it arrives from an unauthenticated browser.
 */

export const SECTION_IDS = [
  "icons",
  "ui-elements",
  "ui-inspiration",
  "pixel-art",
  "music",
  "reading",
] as const;

export const PRICES = ["free", "freemium", "paid", "unknown"] as const;

export const LIMITS = {
  name: 80,
  why: 400,
  submittedBy: 30,
  url: 500,
  tag: 24,
  tags: 6,
};

/** Collapse whitespace and strip control characters. */
export function clean(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Accept only absolute http(s) URLs. Rejects javascript:, data:, vbscript: and
 * anything else that could execute when rendered as an href.
 * SECURITY-REVIEW: this is the only guard between a submitted string and an
 * anchor href on the public page; the frontend also escapes on render.
 */
export function normalizeUrl(input: unknown): string | null {
  const raw = clean(input, LIMITS.url);
  if (!raw) return null;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;
  parsed.hash = "";
  return parsed.toString();
}

/** Compare two URLs ignoring protocol, www, trailing slash and query order. */
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return host + path;
  } catch {
    return url.toLowerCase();
  }
}

export function cleanTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    const tag = clean(raw, LIMITS.tag)
      .toLowerCase()
      .replace(/[^a-z0-9.+-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (tag.length >= 2) seen.add(tag);
    if (seen.size >= LIMITS.tags) break;
  }
  return [...seen];
}

export function isSection(value: string): boolean {
  return (SECTION_IDS as readonly string[]).includes(value);
}

export function isPrice(value: string): boolean {
  return (PRICES as readonly string[]).includes(value);
}

/** Visitor ids are generated client-side with crypto.randomUUID(). */
export function isVisitorId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9-]{8,64}$/.test(value);
}
