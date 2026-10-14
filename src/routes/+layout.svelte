<script lang="ts">
	import { page } from '$app/state';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	/**
	 * The two views of the same obsession: the cycle as it is right now, and the
	 * 1952-2001 dataset once it has been checked against the ephemeris.
	 */
	const NAV = [
		{ href: '/', label: 'Le cycle' },
		{ href: '/portails', label: 'Portails 1952-2001' }
	] as const;
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

<nav>
	<a class="brand" href="/">
		<span class="star" aria-hidden="true">♀</span>
		Le Voyage de Vénus
	</a>
	<ul>
		{#each NAV as item (item.href)}
			<li>
				<a href={item.href} aria-current={page.url.pathname === item.href ? 'page' : undefined}>{item.label}</a>
			</li>
		{/each}
	</ul>
</nav>

{@render children()}

<style>
	nav {
		position: relative;
		z-index: 1;
		max-width: 1240px;
		margin: 0 auto;
		padding: 1.1rem 1.2rem 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--ink);
		font-weight: 600;
		font-size: 0.92rem;
		letter-spacing: -0.01em;
	}

	.brand:hover {
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

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: 0.3rem;
	}

	li a {
		display: inline-block;
		padding: 0.35rem 0.7rem;
		border-radius: 8px;
		font-size: 0.8rem;
		color: var(--ink-faint);
		border: 1px solid transparent;
	}

	li a:hover {
		color: var(--ink);
		background: #ffffff08;
		text-decoration: none;
	}

	li a[aria-current='page'] {
		color: var(--venus);
		border-color: #2c7f5e66;
		background: #7ce0b014;
		font-weight: 600;
	}
</style>
