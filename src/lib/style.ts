import type { CSSProperties } from "react";

const cache = new Map<string, CSSProperties>();

/**
 * Parses a literal CSS declaration string ("display:flex;gap:10px;")
 * into a React style object, cached by input string. Lets prototype
 * markup be ported with its original inline `style="..."` strings
 * (verbatim or template-literal'd for dynamic parts) instead of
 * hand-converting every declaration to a JS object literal.
 */
export function s(css: string): CSSProperties {
  const cached = cache.get(css);
  if (cached) return cached;

  const out: Record<string, string> = {};
  for (const rule of css.split(";")) {
    const idx = rule.indexOf(":");
    if (idx === -1) continue;
    const prop = rule.slice(0, idx).trim();
    const value = rule.slice(idx + 1).trim();
    if (!prop || !value) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = value;
  }

  const result = out as CSSProperties;
  cache.set(css, result);
  return result;
}
