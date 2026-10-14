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

/**
 * A moment inside a gate's window.
 *
 * The window is half a day either side of the exact conjunction, so a date at midnight is
 * not necessarily inside it — 2024-04-07's conjunction falls at 18:21 local, and midnight is
 * more than half a day before that. The tests therefore start from the conjunction's own
 * instant, taken from the engine rather than typed in.
 */
const GATE_DAY = new Date('2024-04-07T00:00:00Z');
const GATE_MOMENT = computeJourney(GATE_DAY)
	.conjunctions.filter((p) => p.observable)
	.sort((a, b) => Math.abs(a.at.getTime() - GATE_DAY.getTime()) - Math.abs(b.at.getTime() - GATE_DAY.getTime()))[0].at;

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

	it('names the open gate at the exact instant of the conjunction', async () => {
		// GATE_MOMENT is the instant of a portal, taken from the engine, so the gate is open
		// and the heading names it. The axis paragraph also mentions an open portal, so the
		// heading is what gets checked.
		await mountPage(GATE_MOMENT);
		const journey = computeJourney(GATE_MOMENT);
		expect(journey.activePassage).not.toBeNull();
		const gate = journey.activePassage!.gate;
		expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(gate.name);
		expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Portail ouvert');
		// A portal is always an observable conjunction.
		expect(Math.abs(journey.activePassage!.elongation)).toBeGreaterThanOrEqual(journey.portalVisibility);
	});

	it('lists the seven gates with their Sanskrit names', async () => {
		const { container } = await mountPage(GATE_DAY);
		// Each centre appears both in the gate list and, when focus lands on it, in the
		// detail panel — so the list itself is the thing to count.
		const list = container.querySelector('.gates ul')!;
		const rows = Array.from(list.querySelectorAll('.name')).map((el) =>
			el.textContent?.replace(/\s+/g, ' ').trim() ?? ''
		);
		// Seven chakras always; an eighth row only when this half of the cycle holds one
		// portal more, and then it is the threshold rather than a chakra.
		expect([GATES.length, GATES.length + 1]).toContain(rows.length);
		for (const [index, gate] of GATES.entries()) {
			expect(rows[index]).toContain(gate.name);
			expect(rows[index]).toContain(gate.sanskrit);
		}
		expect(rows.slice(GATES.length).join(' ')).toMatch(/intentionnelle/);
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

	it('annonce l’instant exact du portail, avec la date et l’heure', async () => {
		const { container } = await mountPage(GATE_MOMENT);
		const journey = computeJourney(GATE_MOMENT);
		const active = journey.activePassage!;

		// The hour of the conjunction itself, on the page — the reader is told when the gate
		// opens, not merely which day.
		const heroLine = screen.getByText(/Conjonction exacte le/).textContent ?? '';
		const hhmm = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(active.at);
		expect(heroLine).toContain(hhmm);
		expect(heroLine).toMatch(/\d+\s+\w+\s+\d{4}/);

		// The zodiacal degree of the gate is stated too.
		expect(heroLine).toMatch(/\d+°\s?\d*\s?\w+/);

		// The detail panel must describe the passage of the same half of the cycle as the
		// conjunction in progress — the two halves each hold a full descent, so the same
		// chakra opens twice and pairing by gate alone picks the wrong one.
		const paired = passageForGate(journey, active.gate.key)!;
		expect(paired.at.getTime()).toBe(active.at.getTime());

		const detail = container.querySelector('.detail')!;
		expect(detail.textContent).toContain(hhmm);
		// The detail says when the gate opens and at what degree — nothing more. The distance
		// between the two bodies is no longer displayed: it is a measurement, not a datum the
		// reader asked for, and since the orb left the model there is nothing to compare it to.
		expect(detail.textContent).toContain(paired.longitude.toFixed(0));
		expect(detail.textContent).not.toMatch(/\d,\d\d° de Vénus/);
	});

	it('ne qualifie jamais un portail : ni serré, ni manqué', async () => {
		const { container } = await mountPage(GATE_DAY);
		const text = container.textContent ?? '';
		for (const verdict of ['manqué', 'manquée', 'trop loin', 'serré']) {
			expect(text).not.toContain(verdict);
		}
		// And no control lets the reader grade a gate either.
		expect(screen.queryByLabelText(/Orbe/)).toBeNull();
		expect(screen.queryByText(/Orbe d’ouverture/)).toBeNull();
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
