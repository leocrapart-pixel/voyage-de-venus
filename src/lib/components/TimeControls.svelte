<script lang="ts">
	/**
	 * Moving through time.
	 *
	 * The heavy part of the app is a search through the ephemeris, so the controls do not
	 * recast on every keystroke: the route debounces the chosen moment (see
	 * `src/routes/+page.svelte`).
	 *
	 * Nothing here changes what the cycle means — only when it is read. The invisibility
	 * threshold, the orb and the portal count are all fixed: they are observations, not
	 * settings, and a cursor on them would suggest the sky is negotiable.
	 */
	interface Props {
		/** The moment the chart shows — not necessarily "now". */
		value: Date;
		/** The real current time, so "maintenant" can be distinguished from a scrubbed date. */
		now: Date;
		busy?: boolean;
		onchange: (date: Date) => void;
	}

	let { value, now, busy = false, onchange }: Props = $props();

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
	button:focus-visible {
		outline: 2px solid var(--venus);
		outline-offset: 2px;
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
