// Simple, explainable similarity score between a lost and a found report.
const STOP = new Set(['the','a','an','of','and','in','on','at','my','i','is','it','with','to','for','near','was','has','have','found','lost']);
const tokens = (s) => new Set(
  (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)),
);

export function scoreMatch(a, b) {
  let score = 0; const reasons = [];
  if (a.category === b.category) { score += 35; reasons.push('same category'); }
  if (a.location === b.location) { score += 20; reasons.push('same location'); }
  const ta = tokens(`${a.title} ${a.description}`), tb = tokens(`${b.title} ${b.description}`);
  const inter = [...ta].filter((w) => tb.has(w)).length;
  const union = new Set([...ta, ...tb]).size || 1;
  const jac = inter / union;
  if (jac > 0) { score += Math.round(jac * 35); reasons.push(`${inter} shared keyword${inter > 1 ? 's' : ''}`); }
  const days = Math.abs((new Date(a.event_date) - new Date(b.event_date)) / 864e5);
  if (days <= 3) { score += 10; reasons.push('dates within 3 days'); }
  else if (days <= 14) { score += 5; reasons.push('dates within 2 weeks'); }
  return { score: Math.min(score, 100), reasons };
}
