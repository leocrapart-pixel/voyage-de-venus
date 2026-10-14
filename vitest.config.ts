import { defineConfig, mergeConfig } from 'vitest/config';
import appConfig from './vite.config.ts';

/**
 * Test-only config, merged on top of the app's Vite config so the production build
 * keeps its own resolution.
 *
 * Two things need overriding. Svelte 5 ships separate client and server entries and
 * vite-node would otherwise resolve the server one, where `mount()` does not exist, so
 * the browser condition is selected explicitly. And these tests are arithmetic and
 * components, not a browser session, so the environment stays `node` unless a test
 * file asks for `happy-dom` by name.
 */
export default mergeConfig(
	appConfig,
	defineConfig({
		resolve: {
			conditions: ['browser', 'module', 'development']
		},
		test: {
			include: ['src/**/*.test.ts'],
			// Arithmetic tests run in node; a component test opts into a DOM with a
			// `// @vitest-environment happy-dom` docblock at the top of the file.
			environment: 'node'
		}
	})
);
