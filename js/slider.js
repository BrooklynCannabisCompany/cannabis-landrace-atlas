// SPDX-License-Identifier: MIT
// Copyright (c) 2026 The Cannabis Landrace Atlas contributors

// A single-track dual-thumb range slider whose thumbs cannot cross. Shared by the Index
// (Flowering Time facet) and the submission forms. onChange(lo, hi) fires on every change.
// initLo/initHi set the starting thumb positions (default = full range). minGap is the
// minimum distance kept between the thumbs (e.g. 1 so they can never land on the same value).
// fmt formats the value shown in the bubble that floats above each thumb.
export function makeDualSlider(absMin, absMax, onChange, initLo = absMin, initHi = absMax, minGap = 0, fmt = (v) => String(v)) {
  const wrap = document.createElement('div');
  wrap.className = 'dual-slider';
  const track = document.createElement('div'); track.className = 'ds-track';
  const fill = document.createElement('div'); fill.className = 'ds-fill';
  track.appendChild(fill);
  const loBubble = document.createElement('span'); loBubble.className = 'ds-bubble';
  const hiBubble = document.createElement('span'); hiBubble.className = 'ds-bubble';
  const lo = document.createElement('input');
  lo.type = 'range'; lo.min = absMin; lo.max = absMax; lo.value = initLo; lo.className = 'ds-input';
  lo.setAttribute('aria-label', 'Minimum');
  const hi = document.createElement('input');
  hi.type = 'range'; hi.min = absMin; hi.max = absMax; hi.value = initHi; hi.className = 'ds-input';
  hi.setAttribute('aria-label', 'Maximum');
  const span = absMax - absMin || 1;
  const pct = (v) => ((v - absMin) / span) * 100;
  function update() {
    let l = +lo.value; let h = +hi.value;
    if (h - l < minGap) { // keep the thumbs at least minGap apart (and from crossing)
      if (document.activeElement === lo) {
        l = h - minGap;
        if (l < absMin) { l = absMin; h = Math.min(absMax, absMin + minGap); }
      } else {
        h = l + minGap;
        if (h > absMax) { h = absMax; l = Math.max(absMin, absMax - minGap); }
      }
      lo.value = l; hi.value = h;
    }
    fill.style.left = `${pct(l)}%`;
    fill.style.right = `${100 - pct(h)}%`;
    // Align the bubble with the native thumb, which is inset by half its width (9px of 18px).
    const bubbleLeft = (v) => { const p = pct(v); return `calc(${p}% + ${(9 - p * 0.18).toFixed(2)}px)`; };
    loBubble.textContent = fmt(l); loBubble.style.left = bubbleLeft(l);
    hiBubble.textContent = fmt(h); hiBubble.style.left = bubbleLeft(h);
    onChange(l, h);
  }
  lo.addEventListener('input', update);
  hi.addEventListener('input', update);
  wrap.append(track, lo, hi, loBubble, hiBubble);
  return { wrap, update };
}
