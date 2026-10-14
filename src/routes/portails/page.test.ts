// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import Page from './+page.svelte';
import { voyageVenusData } from '#lib/data/venus-journey';

/**
 * La page du jeu 1952-2001.
 *
 * Ce qui compte ici : les 62 entrées atteignent l'écran, les portails et chakras du jeu sont
 * affichés tels quels, et l'interrupteur ajoute bien le degré réel à côté du degré annoncé
 * sans jamais remplacer celui-ci.
 */

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('la page des portails', () => {
	it('affiche les 62 entrées du jeu', async () => {
		const { container } = render(Page);
		flushSync();
		const rows = container.querySelectorAll('.entries li');
		expect(rows.length).toBe(voyageVenusData.length);

		// Chaque date est à l'écran.
		for (const row of voyageVenusData.slice(0, 5)) {
			expect(screen.getByText(row.date)).toBeTruthy();
		}
	});

	it('garde le degré du jeu tel quel, et le propose en regard du degré réel', async () => {
		const { container } = render(Page);
		flushSync();
		const first = voyageVenusData[0];

		// Par défaut : le degré du jeu, et lui seul.
		const row = Array.from(container.querySelectorAll('.entries li')).find((li) =>
			li.textContent?.includes(first.date)
		)!;
		expect(row.textContent).toContain(first.degre);
		expect(row.querySelector('.real')).toBeNull();

		// Après bascule : le degré réel apparaît, le degré annoncé reste.
		const toggle = screen.getByRole('checkbox');
		await fireEvent.click(toggle);
		flushSync();
		const after = Array.from(container.querySelectorAll('.entries li')).find((li) =>
			li.textContent?.includes(first.date)
		)!;
		expect(after.querySelector('.real')).not.toBeNull();
		expect(after.textContent).toContain(first.degre);
	});

	it('affiche les portails et chakras du jeu', async () => {
		const { container } = render(Page);
		flushSync();
		const text = container.textContent ?? '';
		for (const portail of new Set(voyageVenusData.map((r) => r.portail).filter(Boolean))) {
			expect(text).toContain(portail!);
		}
		expect(text).toContain('Portail de la Vie Intentionnelle');
	});

	it('publie le verdict de l’audit sans corriger le jeu', async () => {
		const { container } = render(Page);
		flushSync();
		const summary = container.querySelector<HTMLElement>('.summary')!;
		expect(within(summary).getByText(String(voyageVenusData.length))).toBeTruthy();
		expect(summary.querySelector('.alert')).not.toBeNull();
		expect(summary.querySelector('.alert')!.textContent).toMatch(/\d+ \/ \d+/);
		// Les deux contradictions de phase sont nommées.
		expect(summary.textContent).toContain('1965-08-22');
		expect(summary.textContent).toContain('1985-12-01');
	});

	it('annonce quel nom de portail est proposé et non reçu', async () => {
		const { container } = render(Page);
		flushSync();
		const proposed = container.querySelectorAll('.pairings li.proposed');
		expect(proposed.length).toBe(1);
		expect(proposed[0].textContent).toContain('nom proposé');
		expect(proposed[0].textContent).toContain('Portail de la Vision');
	});
});
