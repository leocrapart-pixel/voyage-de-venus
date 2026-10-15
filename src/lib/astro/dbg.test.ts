import { it } from 'vitest';
import { computeJourney } from './cycle';

it('numérotation', () => {
  for (const iso of ['2024-03-01T00:00:00Z','2025-06-01T00:00:00Z','2031-06-01T00:00:00Z','2028-06-01T00:00:00Z']) {
    const j = computeJourney(new Date(iso));
    console.log(`@N cycle ${j.start.at.toISOString().slice(0,10)}`);
    for (const ph of [j.morning, j.evening]) {
      const ord = ph.portals.slice().sort((a, b) => a.index - b.index);
      console.log(`@N  ${ph.star === 'morning' ? 'DESCENTE' : 'ASCENSION'} (${ord.length} portails) : ${ord.map((p) => p.position + '=' + p.gate.name.replace(/^Portail de |^Portail du |^Portail de l./, '').replace(/ intentionnelle$/, '') ).join('  ')}`);
    }
  }
});
