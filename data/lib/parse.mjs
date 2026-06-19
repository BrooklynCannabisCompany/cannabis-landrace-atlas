// Parses one raw text block (the lines for a single strain) into a partial record.

const HEIGHT_WORDS = [
  'Extremely Tall', 'Very tall', 'Very Tall', 'Medium-tall', 'Medium-short',
  'Short-medium', 'Short-Medium', 'Variable height', 'Tall', 'Medium', 'Short', 'Variable'
];

const FLOWERING_RE = /(\d+\s*[–-]\s*\d+\s*w(?:eeks)?|\d+\s*[–-]\s*\d+\s*weeks|Variable(?:\s*length)?)/i;

function isHeightToken(t) {
  return HEIGHT_WORDS.some((w) => t.toLowerCase() === w.toLowerCase());
}

export function parseEntry(block) {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || '';

  // Notes: everything after a line beginning "Notes:"
  let summary = '';
  let regionRaw = null;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^Notes:/i.test(line)) {
      summary = line.replace(/^Notes:\s*/i, '').trim();
    } else if (/^Region:/i.test(line)) {
      regionRaw = line.replace(/^Region:\s*/i, '').trim();
    } else if (!summary) {
      // a bare line before any Notes — treat as region context
      regionRaw = regionRaw || line;
    } else {
      // a bare line after Notes — also region context (e.g. "Shashamane, Oromia...")
      regionRaw = regionRaw || line;
    }
  }

  // Split name + parenthetical country from the descriptor.
  // Prefer en dash "–"; fall back to a hyphen that is followed by a space.
  // Only treat an en dash as the separator if it appears before the first pipe
  // (en dashes also appear inside flowering ranges like "9–11w").
  let head = first;
  let rest = '';
  const firstPipeIdx = first.indexOf('|');
  const searchBoundary = firstPipeIdx === -1 ? first.length : firstPipeIdx;
  const enDashIdx = first.indexOf('–');
  if (enDashIdx !== -1 && enDashIdx < searchBoundary) {
    head = first.slice(0, enDashIdx);
    rest = first.slice(enDashIdx + 1);
  } else {
    const m = first.match(/-\s+/);
    if (m) {
      head = first.slice(0, m.index);
      rest = first.slice(m.index + m[0].length);
    } else {
      head = first;
      rest = '';
    }
  }
  head = head.trim();
  rest = rest.trim();

  // Country from the last parenthetical group in the head.
  let countryRaw = null;
  let name = head;
  const paren = head.match(/\(([^)]*)\)\s*$/);
  if (paren) {
    countryRaw = paren[1].trim();
    name = head.slice(0, paren.index).trim();
  }

  // Incomplete stub detection.
  const incomplete = /\[incomplete entry/i.test(rest) || (rest === '' && !FLOWERING_RE.test(first));

  // Pipe fields in the descriptor.
  const pieces = rest.split('|').map((p) => p.trim()).filter((p) => p !== '');
  let type = '';
  let height = null;
  let flowering = null;
  let climate = null;

  if (pieces.length > 0 && !incomplete) {
    let flowerIdx = pieces.findIndex((p) => FLOWERING_RE.test(p));
    if (flowerIdx === -1) {
      // No flowering field; first piece is the type, rest unknown.
      type = pieces[0];
    } else {
      flowering = (pieces[flowerIdx].match(FLOWERING_RE) || [pieces[flowerIdx]])[0].trim();
      climate = pieces[flowerIdx + 1] || null;
      const heightIdx = flowerIdx - 1;
      height = heightIdx >= 0 ? pieces[heightIdx] : null;
      // Type = everything before height (or before flowering if no height).
      const typeEnd = heightIdx >= 0 ? heightIdx : flowerIdx;
      type = pieces.slice(0, typeEnd).join(' | ').trim();
      // Guard: if height slot doesn't look like a height, fold it into type.
      if (height && !isHeightToken(height)) {
        type = pieces.slice(0, flowerIdx).join(' | ').trim();
        height = null;
      }
    }
  }

  return {
    name,
    countryRaw: countryRaw || null,
    type: type || (incomplete ? '' : rest),
    height: height || null,
    flowering: flowering || null,
    climate: climate || null,
    summary: summary || '',
    regionRaw: regionRaw || null,
    incomplete
  };
}
