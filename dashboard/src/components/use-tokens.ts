"use client";
import { useEffect, useState } from "react";

const NAMES = ["ink", "ink-2", "muted", "grid", "axis", "surface", "series-1", "series-2", "critical"] as const;
export type Tokens = Record<(typeof NAMES)[number], string>;

const FALLBACK: Tokens = {
  ink: "#000000", "ink-2": "#444444", muted: "#666666", grid: "#e7eef1", axis: "#d4d4d4",
  surface: "#ffffff", "series-1": "#0051a5", "series-2": "#ffc72c", critical: "#d03b3b",
};

/** SVG presentation attributes can't use var(); resolve tokens to hex and re-resolve on theme change. */
export function useTokens(): Tokens {
  const [tokens, setTokens] = useState<Tokens>(FALLBACK);
  useEffect(() => {
    const read = () => {
      const cs = getComputedStyle(document.documentElement);
      setTokens(Object.fromEntries(NAMES.map((n) => [n, cs.getPropertyValue(`--${n}`).trim() || FALLBACK[n]])) as Tokens);
    };
    read();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", read);
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", read);
      mo.disconnect();
    };
  }, []);
  return tokens;
}
