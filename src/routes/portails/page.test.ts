// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import Page from './+page.svelte';
import { voyageVenusData } from '#lib/data/portails-venus';

/**
 * The dataset page, mounted in a DOM.
 *
 * What matters here is that the two layers stay visibly separate: the measured degree and
 * the announced one must both reach the screen, a mismatch must be flagged rather than
 * hidden, and every row of the dataset must appear.
 */

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('la page des portails', () => {
	it('annonce le nombre d’entrées et le verdict de l’audit', async () => {
		const { container } = render(Page);
		flushSync();
		expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('1952');
		const summary = container.querySelector<HTMLElement>('.summary')!;
		expect(within(summary).getByText(String(voyageVenusData.length))).toBeTruthy();
		// The finding itself has to be on the page, not buried in a report.
		expect(summary.querySelector('.alert')).not.toBeNull();
		expect(summary.querySelector('.alert')!.textContent).toMatch(/\d+ \/ \d+/);
	});

	it('affiche chaque entrée avec son degré mesuré et son degré annoncé', async () => {
		const { container } = render(Page);
		flushSync();
		const bodyRows = container.querySelectorAll('tbody tr:not(.note)');
		expect(bodyRows.length).toBe(voyageVenusData.length);
		// Every row carries the measured degree, and the announced one is still readable.
		const first = voyageVenusData[0];
		const row = Array.from(bodyRows).find((r) => r.textContent?.includes(first.date))!;
		expect(row.textContent).toContain(first.degre);
		if (first.degreAnnonce) expect(row.textContent).toContain(first.degreAnnonce);
	});

	it('signale les degrés annoncés qui ne portent pas le signe du ciel', async () => {
		const { container } = render(Page);
		flushSync();
		const flags = container.querySelectorAll('.flag');
		// The count is computed from the data, not asserted from a fixed number.
		const mismatched = voyageVenusData.filter(
			(r) => r.degreAnnonce && r.degre.slice(3) !== r.degreAnnonce.slice(3)
		);
		expect(flags.length).toBe(mismatched.length);
		expect(flags.length).toBeGreaterThan(40);
	});

	it('groupe les entrées par cycle, reconstruit depuis les données', async () => {
		const { container } = render(Page);
		flushSync();
		const cycles = container.querySelectorAll('.cycle');
		const distinct = new Set(voyageVenusData.map((r) => r.debutDeCycle));
		expect(cycles.length).toBe(distinct.size);
	});

	it('filtre par étoile sans perdre d’entrée', async () => {
		const { container } = render(Page);
		flushSync();
		const all = container.querySelectorAll('tbody tr:not(.note)').length;

		const morning = screen.getByRole('button', { name: 'Matin' });
		await fireEvent.click(morning);
		flushSync();
		const filtered = container.querySelectorAll('tbody tr:not(.note)').length;
		expect(filtered).toBe(voyageVenusData.filter((r) => r.etoile === 'matin').length);
		expect(filtered).toBeLessThan(all);

		const every = screen.getByRole('button', { name: 'Toutes' });
		await fireEvent.click(every);
		flushSync();
		expect(container.querySelectorAll('tbody tr:not(.note)').length).toBe(all);
	});

	it('marque les passages où Vénus est invisible', async () => {
		const { container } = render(Page);
		flushSync();
		const invisible = container.querySelectorAll('tbody tr.invisible');
		expect(invisible.length).toBe(voyageVenusData.filter((r) => !r.visible).length);
		expect(invisible.length).toBeGreaterThan(0);
	});

	it('peut masquer la colonne des degrés annoncés', async () => {
		const { container } = render(Page);
		flushSync();
		// Columns are per table, so a single cycle is the thing to count.
		const columns = () => container.querySelectorAll('.cycle th').length / container.querySelectorAll('.cycle').length;
		expect(columns()).toBe(8);
		const toggle = screen.getByRole('checkbox');
		await fireEvent.click(toggle);
		flushSync();
		expect(columns()).toBe(7);
		expect(container.querySelectorAll('.announced').length).toBe(0);
	});
});
