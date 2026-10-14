// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import Page from '../../routes/+page.svelte';
import { computeJourney, passageForGate } from '../astro/cycle';
import { CHAKRA_IMAGE, GATES, spotFor } from '../symbolic/gates';

/**
 * Behaviour of the real page, mounted in a DOM.
 *
 * These tests check the things only a browser can get wrong: that the cycle reaches the
 * screen, that a gate opens on the right date, that clicking a centre reads back the
 * garment the astronomy assigned to it, and that stepping the clock rebuilds the chart.
 *
 * The app reads the real clock once, at mount, so the system time is frozen here to make
 * the assertions deterministic. The page debounces its rebuild by 140 ms, which the tests
 * step over explicitly rather than sleeping.
 */

/** A moment whose nearest Moon-Venus conjunction is a tight one — 2024-04-07, orb 0.35°. */
const GATE_DAY = new Date('2024-04-07T00:00:00Z');

async function mountPage(at: Date) {
	vi.setSystemTime(at);
	const result = render(Page);
	// Step past the debounce, then flush the resulting reactive update.
	await vi.advanceTimersByTimeAsync(200);
	flushSync();
	return result;
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe('the page', () => {
	it('shows the phase, the cycle length and the days remaining', async () => {
		await mountPage(GATE_DAY);
		expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
		// The cycle in progress is the one opened by the 2023-08-13 inferior conjunction.
		expect(screen.getByText(/jour \d+ \/ \d+/)).toBeTruthy();
		expect(screen.getByText(/encore \d+ jours?/)).toBeTruthy();
		expect(screen.getAllByText(/Étoile (du matin|du soir)/).length).toBeGreaterThan(0);
	});

	it('names the open gate when the Moon is inside the orb', async () => {
		await mountPage(GATE_DAY);
		const journey = computeJourney(GATE_DAY);
		expect(journey.activePassage).not.toBeNull();
		const gate = journey.activePassage!.gate;
		expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(gate.name);
		expect(screen.getByText(/Portail ouvert/)).toBeTruthy();
	});

	it('lists the seven gates with their Sanskrit names', async () => {
		const { container } = await mountPage(GATE_DAY);
		// Each centre appears both in the gate list and, when focus lands on it, in the
		// detail panel — so the list itself is the thing to count.
		const list = container.querySelector('.gates ul')!;
		const names = Array.from(list.querySelectorAll('.name')).map((el) =>
			el.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(names.length).toBe(GATES.length);
		for (const [index, gate] of GATES.entries()) {
			expect(names[index]).toContain(gate.name);
			expect(names[index]).toContain(gate.sanskrit);
		}
	});

	it('renders the chakra figure with the seven measured hotspots', async () => {
		const { container } = await mountPage(GATE_DAY);
		const image = container.querySelector<HTMLImageElement>('img[alt*="sept chakras"]');
		expect(image).not.toBeNull();
		expect(image!.getAttribute('src')).toMatch(/seven-chakras/);

		// One ring per gate, drawn at the measured x for every centre: the seven chakras
		// came out of the image on a single vertical axis.
		const rings = Array.from(container.querySelectorAll('.gate-ring'));
		expect(rings.length).toBe(GATES.length);
		for (const ring of rings) {
			// Measured between x = 297.5 and x = 299.0 of 600.
			expect(Math.abs(Number(ring.getAttribute('cx')) - 298)).toBeLessThan(3);
		}

		// The rings must sit at seven distinct heights, in the order of the descent, and
		// each must match the position and size recorded for its chakra.
		const placements = GATES.map((gate) => spotFor(gate.key));
		const tops = rings.map((ring) => Number(ring.getAttribute('cy')));
		expect(new Set(tops).size).toBe(GATES.length);
		expect(tops).toEqual([...tops].sort((a, b) => a - b));
		for (const [index, ring] of rings.entries()) {
			expect(Number(ring.getAttribute('cy'))).toBeCloseTo(
				placements[index].y * CHAKRA_IMAGE.height,
				0
			);
			expect(Number(ring.getAttribute('r'))).toBeCloseTo(placements[index].r * CHAKRA_IMAGE.width, 0);
		}

		// A hit target per ring, never smaller than the 34 px needed to be clickable.
		const hits = Array.from(container.querySelectorAll('.gate-hit'));
		expect(hits.length).toBe(GATES.length);
		for (const hit of hits) {
			expect(Number(hit.getAttribute('r'))).toBeGreaterThanOrEqual(34);
		}
	});

	it('opens a gate detail and reports the garment abandoned', async () => {
		await mountPage(GATE_DAY);
		const root = screen.getByText(/Les vêtements d’Inanna/).closest('section')!;
		const buttons = within(root).getAllByRole('button');
		// The gate list is the first seven buttons in the section.
		const gateButton = buttons[GATES.length - 1];
		await fireEvent.click(gateButton);
		flushSync();
		const gate = GATES[GATES.length - 1];
		const detail = within(root).getByText(/Vêtement abandonné/).closest('article');
		expect(detail?.textContent).toContain(gate.garment);
		expect(detail?.textContent).toContain(gate.release);
	});

	it('reports the orb of the open gate, and of the right half of the cycle', async () => {
		const { container } = await mountPage(GATE_DAY);
		const journey = computeJourney(GATE_DAY);
		const active = journey.activePassage!;
		// The headline prose reports the orb to one decimal, the detail panel to two.
		const hero = screen.getByText(/La Lune passe à/).textContent ?? '';
		const shown = hero.match(/(\d+,\d)°/);
		expect(shown).not.toBeNull();
		expect(Math.abs(Number(shown![1].replace(',', '.')) - active.orb)).toBeLessThan(0.06);

		// The detail panel must describe the passage of the same half of the cycle as the
		// conjunction in progress — the two halves each hold a full descent, so the same
		// chakra opens twice and pairing by gate alone picks the wrong one.
		const paired = passageForGate(journey, active.gate.key)!;
		expect(paired.at.getTime()).toBe(active.at.getTime());

		const detail = container.querySelector('.detail')!;
		expect(detail.textContent).toContain(paired.orb.toFixed(2).replace('.', ','));
		expect(detail.textContent).toContain(
			paired.at.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
		);
	});

	it('rebuilds the cycle when the moment steps forward', async () => {
		const { container } = await mountPage(GATE_DAY);
		const before = container.querySelector('.cursor')?.getAttribute('style');
		const step = screen.getByRole('button', { name: '+30 j' });
		await fireEvent.click(step);
		await vi.advanceTimersByTimeAsync(200);
		flushSync();
		const after = container.querySelector('.cursor')?.getAttribute('style');
		expect(after).not.toBe(before);
	});

	it('walks both halves of the cycle on the timeline', async () => {
		const { container } = await mountPage(GATE_DAY);
		const ticks = container.querySelectorAll('.tick');
		const journey = computeJourney(GATE_DAY);
		expect(ticks.length).toBe(journey.conjunctions.length);
		// Every open passage is drawn solid, every missed orb faint.
		const open = container.querySelectorAll('.tick.open');
		expect(open.length).toBe(journey.conjunctions.filter((c) => c.open).length);
	});

	it('reacts to the arcus visionis setting rather than hiding it', async () => {
		const { container } = await mountPage(GATE_DAY);
		const band = container.querySelector('.band.under') as HTMLElement | null;
		expect(band).not.toBeNull();
		const before = band!.style.width;
		const slider = screen.getByLabelText(/Arcus visionis/) as HTMLInputElement;
		await fireEvent.input(slider, { target: { value: '14' } });
		await vi.advanceTimersByTimeAsync(200);
		flushSync();
		// A wider arcus visionis makes the inframonde longer, so the band must grow.
		const after = (container.querySelector('.band.under') as HTMLElement)?.style.width;
		expect(after).not.toBe(before);
		const journey = computeJourney(GATE_DAY, { arcusVisionis: 14 });
		expect(journey.invisible!.days).toBeGreaterThan(computeJourney(GATE_DAY).invisible!.days);
	});
});
