/// <reference types="vite/client" />

/**
 * SvelteKit's generated ambient types.
 *
 * SvelteKit 3 no longer emits a base `tsconfig.json` into `.svelte-kit`, so the project
 * declares its own compiler options (see `tsconfig.json`) and pulls in the generated
 * route types by path. This file exists so editors and `svelte-check` agree about
 * `#lib`, asset imports and the `$types` modules the routes use.
 */

declare module '*?raw' {
	const content: string;
	export default content;
}

declare module '*.svg' {
	const src: string;
	export default src;
}

declare module '*.png' {
	const src: string;
	export default src;
}
