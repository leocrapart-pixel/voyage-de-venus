/**
 * Same shell as the rest of the app: a client-side page, prerendered so a static host can
 * serve it directly. The dataset is a compiled-in module, so there is nothing to fetch.
 */
export const ssr = false;
export const prerender = true;
