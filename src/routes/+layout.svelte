<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Le Voyage de Vénus · cycle synodique et portails d'Inanna</title>
	<meta
		name="description"
		content="Le cycle synodique de Vénus calculé dans le navigateur : étoile du matin et du soir, rétrogradation, inframonde, et les sept portails d'Inanna associés aux chakras."
	/>
	<meta name="theme-color" content="#06060c" />
</svelte:head>

{@render children()}
