/**
 * Route types, re-exported for the editor.
 *
 * SvelteKit generates `.svelte-kit/types/src/routes/$types.d.ts`, and routes normally
 * import it as `./$types` — a path that only resolves inside the generated tree. This
 * one-line bridge puts the same module next to the routes so `svelte-check` and editors
 * resolve `import type { LayoutProps } from './$types'` the way the framework intends.
 */
export * from '../../.svelte-kit/types/src/routes/$types';
