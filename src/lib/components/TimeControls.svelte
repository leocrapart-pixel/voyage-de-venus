<script lang="ts">
	/**
	 * Moving through time.
	 *
	 * The heavy part of the app is a search through the ephemeris, so the controls do not
	 * recast on every keystroke: the route debounces the chosen moment (see
	 * `src/routes/+page.svelte`). Two settings change what the cycle means rather than
	 * when it is read, so they are here beside the clock:
	 *
	 * - the **orbe** decides when a Moon-Venus conjunction counts as an open gate;
	 * - the **arcus visionis** decides how close to the Sun Venus may be and still be
	 *   visible, which is what fixes the length of the inframonde. It is an observational
	 *   parameter, not a constant, so it is exposed instead of hard-coded.
	 */
	interface Props {
		/** The moment the chart shows — not necessarily "now". */
		value: Date;
		/** The real current time, so "maintenant" can be distinguished from a scrubbed date. */
		now: Date;
		busy?: boolean;
		arcusVisionis: number;
		openOrb: number;
		tightOrb: number;
		onchange: (date: Date) => void;
		onarcus: (deg: number) => void;
		onorb: (orb: { openOrb: number; tightOrb: number }) => void;
	}

	let {
		value,
		now,
		busy = false,
		arcusVisionis,
		openOrb,
		tightOrb,
		onchange,
		onarcus,
		onorb
	}: Props = $props();

	/** `datetime-local` wants a local-time string without a zone. */
	function toInput(date: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	const inputValue = $derived(toInput(value));
	const atNow = $derived(Math.abs(value.getTime() - now.getTime()) < 60_000);

	function step(days: number) {
		onchange(new Date(value.getTime() + days * 86_400_000));
	}

	function onKey(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) return;
		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			step(event.shiftKey ? -7 : -1);
		} else if (event.key === 'ArrowRight') {
			event.preventDefault();
			step(event.shiftKey ? 7 : 1);
		} else if (event.key === 'n' || event.key === 'N') {
			event.preventDefault();
			onchange(new Date());
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="controls" class:busy>
	<div class="row">
		<label class="field">
			<span class="eyebrow">Moment observé</span>
			<input
				type="datetime-local"
				value={inputValue}
				onchange={(event) => onchange(new Date((event.currentTarget as HTMLInputElement).value))}
			/>
		</label>

		<div class="steps">
			<button type="button" onclick={() => step(-30)} title="Reculer de 30 jours (maj + ← pour 7 jours)">−30 j</button>
			<button type="button" onclick={() => step(-7)} title="Reculer de 7 jours">−7 j</button>
			<button type="button" onclick={() => step(-1)} title="Reculer d'un jour (←)">−1 j</button>
			<button type="button" class="now" class:active={atNow} onclick={() => onchange(new Date())} title="Revenir à maintenant (n)">
				maintenant
			</button>
			<button type="button" onclick={() => step(1)} title="Avancer d'un jour (→)">+1 j</button>
			<button type="button" onclick={() => step(7)} title="Avancer de 7 jours">+7 j</button>
			<button type="button" onclick={() => step(30)} title="Avancer de 30 jours">+30 j</button>
		</div>
	</div>

	<div class="row settings">
		<label class="field small">
			<span class="eyebrow">Arcus visionis · {arcusVisionis}°</span>
			<input
				type="range"
				min="2"
				max="20"
				step="1"
				value={arcusVisionis}
				oninput={(event) => onarcus(Number((event.currentTarget as HTMLInputElement).value))}
			/>
			<span class="hint">sous ce seuil d’élongation, Vénus est invisible</span>
		</label>

		<label class="field small">
			<span class="eyebrow">Orbe d’ouverture · {openOrb}°</span>
			<input
				type="range"
				min="1"
				max="8"
				step="0.5"
				value={openOrb}
				oninput={(event) => {
					const next = Number((event.currentTarget as HTMLInputElement).value);
					onorb({ openOrb: next, tightOrb: Math.min(tightOrb, next) });
				}}
			/>
			<span class="hint">au-delà, la conjonction ne franchit pas la porte</span>
		</label>

		<label class="field small">
			<span class="eyebrow">Portail serré · {tightOrb}°</span>
			<input
				type="range"
				min="0.5"
				max={openOrb}
				step="0.5"
				value={tightOrb}
				oninput={(event) => onorb({ openOrb, tightOrb: Number((event.currentTarget as HTMLInputElement).value) })}
			/>
			<span class="hint">en deçà, la Lune passe au plus près</span>
		</label>
	</div>

	<p class="keyboard faint">Flèches ← → pour un jour, maj + flèches pour une semaine, <kbd>n</kbd> pour maintenant.</p>
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.controls.busy {
		opacity: 0.65;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem 1.2rem;
		align-items: flex-end;
	}

	.settings {
		padding-top: 0.8rem;
		border-top: 1px dashed var(--line-soft);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.field.small {
		flex: 1 1 180px;
		min-width: 160px;
	}

	input[type='datetime-local'] {
		background: #080a12;
		border: 1px solid var(--line);
		color: var(--ink);
		border-radius: var(--radius-sm);
		padding: 0.42rem 0.6rem;
		font: inherit;
		font-size: 0.84rem;
		color-scheme: dark;
	}

	input[type='datetime-local']:focus-visible,
	button:focus-visible,
	input[type='range']:focus-visible {
		outline: 2px solid var(--venus);
		outline-offset: 2px;
	}

	input[type='range'] {
		width: 100%;
		accent-color: var(--venus);
	}

	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.steps button {
		background: #ffffff07;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.38rem 0.6rem;
		font-size: 0.78rem;
		color: var(--ink-dim);
	}

	.steps button:hover {
		background: #ffffff12;
		color: var(--ink);
	}

	.steps .now {
		color: var(--ink);
		font-weight: 600;
	}

	.steps .now.active {
		background: #7ce0b022;
		border-color: var(--venus);
		color: var(--venus);
	}

	.hint {
		font-size: 0.66rem;
		color: var(--ink-ghost);
	}

	.keyboard {
		font-size: 0.7rem;
	}

	kbd {
		background: #ffffff10;
		border: 1px solid var(--line);
		border-radius: 4px;
		padding: 0.05rem 0.3rem;
		font-size: 0.7rem;
		font-family: inherit;
	}
</style>
