/**
 * The Voyage de Vénus is a client-side application.
 *
 * The cycle analysis costs a few hundred milliseconds — it searches several years of
 * ephemeris for inferior conjunctions, the retrograde window and ~20 Moon-Venus
 * conjunctions — and it is inherently browser-side work: the reader can scrub to any
 * date, so there is nothing meaningful to render on a server anyway. Disabling SSR
 * keeps the whole engine in one place and ships a static bundle that any host can
 * serve (see `vite.config.ts`).
 */
export const ssr = false;
export const prerender = false;
