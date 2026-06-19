// Parses one raw text block (the lines for a single strain) into a partial record.

const HEIGHT_WORDS = [
  'Extremely Tall', 'Very tall', 'Medium-tall', 'Medium-short',
  'Short-medium', 'Variable height', 'Tall', 'Medium', 'Short', 'Variable'
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
    } else {
      // a bare line (before or after Notes) — treat as region context
      regionRaw = regionRaw || line;
    }
  }

  // Split name + parenthetical country from the descriptor.
  // Prefer en dash "–"; fall back to a hyphen that is followed by a space.
  // Only treat an en dash as the separator if it appears before the first pipe
  // (en dashes also appear inside flowering ranges like "9–11w").
  // Crucially, ignore any "–" or "-" that is inside parentheses (depth > 0),
  // so that "Rift Valley Corridor (Kenya–Ethiopia–Tanzania) – ..." splits at
  // the outer en-dash, not the ones inside the parens.
  let head = first;
  let rest = '';
  const firstPipeIdx = first.indexOf('|');
  const searchBoundary = firstPipeIdx === -1 ? first.length : firstPipeIdx;

  // Scan character-by-character tracking paren depth to find the first
  // depth-0 en-dash, then as a fallback the first depth-0 hyphen followed by
  // a space — both must be before the first pipe.
  let depth0EnDash = -1;
  let depth0HyphenSpace = -1;
  let parenDepth = 0;
  for (let i = 0; i < searchBoundary; i++) {
    const ch = first[i];
    if (ch === '(') { parenDepth++; continue; }
    if (ch === ')') { parenDepth = Math.max(0, parenDepth - 1); continue; }
    if (parenDepth === 0) {
      if (ch === '–' && depth0EnDash === -1) {
        depth0EnDash = i;
        break; // en-dash wins immediately
      }
      if (ch === '-' && depth0HyphenSpace === -1 && first[i + 1] === ' ') {
        depth0HyphenSpace = i;
        // keep scanning in case there's a later en-dash (but en-dash breaks early)
      }
    }
  }

  if (depth0EnDash !== -1) {
    head = first.slice(0, depth0EnDash);
    rest = first.slice(depth0EnDash + 1);
  } else if (depth0HyphenSpace !== -1) {
    head = first.slice(0, depth0HyphenSpace);
    rest = first.slice(depth0HyphenSpace + 2); // skip "- "
  } else {
    // Final fallback: hyphen without space (e.g. "Name- descriptor")
    const m = first.match(/-\s*/);
    if (m && m.index < searchBoundary) {
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
    // Prefer a numeric range WITH a weeks suffix for the flowering field.
    // Fall back to any numeric range (but not inside height annotations like
    // "Tall (2–4m)"), then to a whole-token Variable/Variable-length match
    // (anchored so it does NOT accidentally match "Variable height").
    let flowerIdx = pieces.findIndex((p) => /\d+\s*[–-]\s*\d+\s*w(?:eeks)?/i.test(p));
    if (flowerIdx === -1) {
      // Bare numeric range only if the piece is not a height word with a
      // parenthetical annotation (e.g. "Tall (2–4m)").
      flowerIdx = pieces.findIndex((p) => {
        if (!/\d+\s*[–-]\s*\d+/.test(p)) return false;
        const withoutParen = p.replace(/\s*\(.*\)\s*$/, '').trim();
        return !isHeightToken(withoutParen);
      });
    }
    if (flowerIdx === -1) {
      flowerIdx = pieces.findIndex((p) => /^Variable(?:\s*length)?$/i.test(p));
    }

    if (flowerIdx === -1) {
      // No flowering field; first piece is the type, rest unknown.
      type = pieces[0];
    } else {
      const fpiece = pieces[flowerIdx];
      const fmatch = fpiece.match(/\d+\s*[–-]\s*\d+\s*w(?:eeks)?|\d+\s*[–-]\s*\d+\s*weeks|^Variable(?:\s*length)?$/i);
      flowering = (fmatch ? fmatch[0] : fpiece).trim();
      climate = pieces[flowerIdx + 1] || null;
      const heightIdx = flowerIdx - 1;
      height = heightIdx >= 0 ? pieces[heightIdx] : null;
      // Type = everything before height (or before flowering if no height).
      const typeEnd = heightIdx >= 0 ? heightIdx : flowerIdx;
      type = pieces.slice(0, typeEnd).join(' | ').trim();
      // Guard: if height slot doesn't look like a height, fold it into type.
      // Strip trailing parentheticals for the check only — keep full value if valid.
      if (height) {
        const heightCheck = height.replace(/\s*\(.*\)\s*$/, '').trim();
        if (!isHeightToken(heightCheck)) {
          type = pieces.slice(0, flowerIdx).join(' | ').trim();
          height = null;
        }
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
