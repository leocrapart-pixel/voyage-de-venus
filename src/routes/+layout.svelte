<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Le Voyage de Vénus · cycle synodique et portails d’Inanna</title>
	<meta
		name="description"
		content="Le cycle synodique de Vénus calculé dans le navigateur : étoile du matin et du soir, rétrogradation, inframonde, et les sept portails d’Inanna associés aux chakras."
	/>
	<meta name="theme-color" content="#06060c" />
</svelte:head>

<header class="brand">
	<a href="/">
		<span class="star" aria-hidden="true">♀</span>
		Le Voyage de Vénus
	</a>
</header>

{@render children()}

<style>
	.brand {
		position: relative;
		z-index: 1;
		max-width: 1240px;
		margin: 0 auto;
		padding: 1.1rem 1.2rem 0;
	}

	.brand a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--ink);
		font-weight: 600;
		font-size: 0.92rem;
		letter-spacing: -0.01em;
	}

	.brand a:hover {
		text-decoration: none;
		color: var(--venus);
	}

	.star {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: #7ce0b014;
		color: var(--venus);
		font-size: 0.9rem;
	}
</style>
