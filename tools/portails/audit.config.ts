import { defineConfig } from 'vitest/config';

/**
 * Config de test dédiée à l'audit du jeu de données.
 *
 * Elle n'inclut pas le plugin SvelteKit : l'audit ne touche que le moteur astronomique,
 * qui est du TypeScript pur. Cela évite de faire tourner tout le pipeline Svelte pour un
 * script qui ne rend rien.
 */
export default defineConfig({
	resolve: { conditions: ['browser', 'module', 'development'] },
	test: {
		include: ['tools/portails/audit.ts'],
		environment: 'node'
	}
});
