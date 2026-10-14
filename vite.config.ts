import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

/**
 * A single-page application, and nothing else.
 *
 * The Voyage de Vénus has no backend: the whole cycle is computed in the browser from
 * the ephemeris library. `adapter-static` with `fallback` therefore emits one
 * `index.html` shell plus the JS/CSS bundles, which any static host (GitHub Pages,
 * Cloudflare Pages, Netlify) can serve — no Node runtime, no Worker, no functions.
 *
 * `ssr = false` lives in `src/routes/+layout.ts`, which is what makes this a genuine
 * SPA rather than a prerendered page that then hydrates.
 *
 * SvelteKit 3 takes its configuration here rather than from a `svelte.config.js`.
 */
export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Runes mode everywhere in this project; libraries keep their own choice.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: 'index.html',
				precompress: false,
				strict: false
			})
		})
	],
	test: {
		environment: 'happy-dom',
		include: ['src/**/*.test.ts'],
		globals: false
	}
});
