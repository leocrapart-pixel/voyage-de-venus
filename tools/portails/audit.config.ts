import { defineConfig } from 'vitest/config';

/**
 * Config de test dédiée au jeu de données 1952-2001.
 *
 * Elle n'inclut pas le plugin SvelteKit : l'audit ne touche que le moteur astronomique, qui
 * est du TypeScript pur. Cela évite de faire tourner tout le pipeline Svelte pour un script
 * qui ne rend rien.
 */
export default defineConfig({
	resolve: { conditions: ['browser', 'module', 'development'] },
	test: { include: ['tools/portails/audit.test.ts'], environment: 'node' }
});
