// Approximate centroids [lat, lng] for countries/territories present in the dataset.
export const COUNTRY_CENTROIDS = {
  // Africa
  'Angola': { lat: -11.2, lng: 17.9 }, 'Morocco': { lat: 31.8, lng: -7.1 },
  'Ethiopia': { lat: 9.1, lng: 40.5 }, 'Senegal': { lat: 14.5, lng: -14.4 },
  'Cameroon': { lat: 5.7, lng: 12.7 }, 'Nigeria': { lat: 9.1, lng: 8.7 },
  'Kenya': { lat: 0.2, lng: 37.9 }, 'Tanzania': { lat: -6.4, lng: 34.9 },
  'Uganda': { lat: 1.4, lng: 32.3 }, 'Rwanda': { lat: -1.9, lng: 29.9 },
  'Gabon': { lat: -0.8, lng: 11.6 }, 'Madagascar': { lat: -18.8, lng: 46.9 },
  'Mauritius': { lat: -20.3, lng: 57.6 }, 'Mozambique': { lat: -18.7, lng: 35.5 },
  'Zimbabwe': { lat: -19.0, lng: 29.2 }, 'Namibia': { lat: -22.6, lng: 17.1 },
  'Malawi': { lat: -13.3, lng: 34.3 }, 'South Africa': { lat: -30.6, lng: 24.0 },
  'Lesotho': { lat: -29.6, lng: 28.2 }, 'Sierra Leone': { lat: 8.5, lng: -11.8 },
  'Guinea-Bissau': { lat: 12.0, lng: -15.0 }, 'Equatorial Guinea': { lat: 1.6, lng: 10.3 },
  'DRC': { lat: -2.9, lng: 23.7 }, 'DR Congo': { lat: -2.9, lng: 23.7 },
  'Congo': { lat: -0.7, lng: 15.5 }, 'Central African Republic': { lat: 6.6, lng: 20.9 },
  'Réunion': { lat: -21.1, lng: 55.5 }, 'Eswatini': { lat: -26.5, lng: 31.5 },
  // Middle East / Central Asia
  'Afghanistan': { lat: 33.9, lng: 67.7 }, 'Pakistan': { lat: 30.4, lng: 69.3 },
  'Iran': { lat: 32.4, lng: 53.7 }, 'Turkey': { lat: 39.0, lng: 35.2 },
  'Lebanon': { lat: 33.9, lng: 35.9 }, 'Syria': { lat: 35.0, lng: 38.5 },
  'Egypt': { lat: 26.8, lng: 30.8 }, 'Kazakhstan': { lat: 48.0, lng: 66.9 },
  'Kyrgyzstan': { lat: 41.2, lng: 74.8 }, 'Tajikistan': { lat: 38.9, lng: 71.3 },
  'Uzbekistan': { lat: 41.4, lng: 64.6 }, 'Turkmenistan': { lat: 38.97, lng: 59.6 },
  'China': { lat: 35.9, lng: 104.2 }, 'Mongolia': { lat: 46.9, lng: 103.8 },
  'Russia': { lat: 61.5, lng: 105.3 },
  // South Asia
  'India': { lat: 22.0, lng: 79.0 }, 'Nepal': { lat: 28.4, lng: 84.1 },
  'Bhutan': { lat: 27.5, lng: 90.4 }, 'Bangladesh': { lat: 23.7, lng: 90.4 },
  // Southeast Asia
  'Thailand': { lat: 15.9, lng: 100.99 }, 'Laos': { lat: 19.9, lng: 102.5 },
  'Vietnam': { lat: 14.1, lng: 108.3 }, 'Cambodia': { lat: 12.6, lng: 104.9 },
  'Myanmar': { lat: 21.9, lng: 95.96 }, 'Indonesia': { lat: -2.5, lng: 118.0 },
  'Philippines': { lat: 12.9, lng: 121.8 }, 'Malaysia': { lat: 4.2, lng: 109.5 },
  'Timor-Leste': { lat: -8.8, lng: 125.7 },
  // East Asia / North Asia
  'Japan': { lat: 36.2, lng: 138.3 }, 'North Korea': { lat: 40.3, lng: 127.5 },
  'South Korea': { lat: 36.5, lng: 127.8 }, 'Korea': { lat: 37.5, lng: 127.0 },
  // Europe
  'Albania': { lat: 41.2, lng: 20.2 }, 'Armenia': { lat: 40.1, lng: 45.0 },
  'Azerbaijan': { lat: 40.1, lng: 47.6 }, 'Georgia': { lat: 42.3, lng: 43.4 },
  'Greece': { lat: 39.1, lng: 22.0 }, 'Italy': { lat: 42.8, lng: 12.6 },
  'Spain': { lat: 40.0, lng: -3.7 }, 'Portugal': { lat: 39.5, lng: -8.0 },
  'France': { lat: 46.6, lng: 2.5 }, 'Hungary': { lat: 47.2, lng: 19.5 },
  'Romania': { lat: 45.9, lng: 24.97 }, 'Serbia': { lat: 44.0, lng: 21.0 },
  'Bosnia & Herzegovina': { lat: 43.9, lng: 17.7 }, 'Kosovo': { lat: 42.6, lng: 20.9 },
  'North Macedonia': { lat: 41.6, lng: 21.7 }, 'Montenegro': { lat: 42.7, lng: 19.4 },
  'Ukraine': { lat: 48.4, lng: 31.2 }, 'Belarus': { lat: 53.7, lng: 27.95 },
  'Crimea': { lat: 45.3, lng: 34.4 }, 'Germany': { lat: 51.2, lng: 10.4 },
  'Poland': { lat: 51.9, lng: 19.1 }, 'Czech Republic': { lat: 49.8, lng: 15.5 },
  'Slovakia': { lat: 48.7, lng: 19.7 }, 'Baltics': { lat: 56.9, lng: 24.6 },
  'Cyprus': { lat: 35.1, lng: 33.4 },
  // Oceania
  'Papua New Guinea': { lat: -6.3, lng: 143.96 }, 'Fiji': { lat: -17.7, lng: 178.1 },
  'Vanuatu': { lat: -15.4, lng: 166.96 }, 'Solomon Islands': { lat: -9.6, lng: 160.2 },
  'New Caledonia': { lat: -20.9, lng: 165.6 }, 'New Zealand': { lat: -41.0, lng: 174.0 },
  'Australia': { lat: -25.3, lng: 133.8 }, 'French Polynesia': { lat: -17.7, lng: -149.4 },
  // Americas
  'Mexico': { lat: 23.6, lng: -102.6 }, 'Guatemala': { lat: 15.8, lng: -90.2 },
  'Honduras': { lat: 15.2, lng: -86.2 }, 'Panama': { lat: 8.5, lng: -80.8 },
  'Colombia': { lat: 4.6, lng: -74.3 }, 'Venezuela': { lat: 6.4, lng: -66.6 },
  'Ecuador': { lat: -1.8, lng: -78.2 }, 'Peru': { lat: -9.2, lng: -75.0 },
  'Bolivia': { lat: -16.3, lng: -63.6 }, 'Brazil': { lat: -10.8, lng: -53.1 },
  'Argentina': { lat: -38.4, lng: -63.6 }, 'Paraguay': { lat: -23.4, lng: -58.4 },
  'Guyana': { lat: 4.9, lng: -58.9 }, 'Suriname': { lat: 4.0, lng: -56.0 },
  'Jamaica': { lat: 18.1, lng: -77.3 }, 'Cuba': { lat: 21.5, lng: -79.5 },
  'Puerto Rico': { lat: 18.2, lng: -66.5 }, 'Dominica': { lat: 15.4, lng: -61.4 },
  'Grenada': { lat: 12.1, lng: -61.7 }, 'Guadeloupe': { lat: 16.25, lng: -61.6 },
  'Martinique': { lat: 14.6, lng: -61.0 }, 'Saint Lucia': { lat: 13.9, lng: -61.0 },
  'Saint Kitts & Nevis': { lat: 17.3, lng: -62.75 },
  'Saint Vincent & the Grenadines': { lat: 13.25, lng: -61.2 },
  'Trinidad & Tobago': { lat: 10.5, lng: -61.3 }, 'United States': { lat: 39.8, lng: -98.6 },
  'USA': { lat: 39.8, lng: -98.6 }, 'Canada': { lat: 56.1, lng: -106.3 },
  'Hawaii': { lat: 20.8, lng: -156.3 }
};

// Synonyms / alternate spellings normalized to a table key.
const COUNTRY_ALIASES = {
  'Hawaii, USA': 'Hawaii', 'French Caribbean': 'Martinique', 'Kosovo': 'Kosovo',
  'Czech Republic / Slovakia': 'Czech Republic', 'Republic of Congo': 'Congo'
};

function resolveCountryKey(countryRaw) {
  if (!countryRaw) return null;
  if (COUNTRY_ALIASES[countryRaw]) return COUNTRY_ALIASES[countryRaw];
  if (COUNTRY_CENTROIDS[countryRaw]) return countryRaw;
  // Multi-country strings: split on / – , and take the first recognized.
  const tokens = countryRaw.split(/[\/–,-]/).map((s) => s.trim());
  for (const tok of tokens) {
    if (COUNTRY_CENTROIDS[tok]) return tok;
    if (COUNTRY_ALIASES[tok]) return COUNTRY_ALIASES[tok];
  }
  return null;
}

// Deterministic small offset in degrees from a string seed.
export function jitter(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;      // 0..1
  const b = (((h >>> 10) >>> 0) % 1000) / 1000;
  return { dLat: (a - 0.5) * 1.0, dLng: (b - 0.5) * 1.0 }; // ±0.5°
}

// Optional per-region overrides keyed by an exact regionRaw or name string.
// Populate during QA for localities far from their country centroid.
export const REGION_OVERRIDES = {
  // 'Kona District, Hawaiʻi (Big Island)': { lat: 19.6, lng: -155.9 },
};

export function resolveCoords({ countryRaw, regionRaw, id }) {
  let base = null;
  if (regionRaw && REGION_OVERRIDES[regionRaw]) base = REGION_OVERRIDES[regionRaw];
  if (!base) {
    const key = resolveCountryKey(countryRaw);
    if (key) base = COUNTRY_CENTROIDS[key];
  }
  if (!base) return null;
  const { dLat, dLng } = jitter(id || regionRaw || countryRaw || 'seed');
  return { lat: +(base.lat + dLat).toFixed(4), lng: +(base.lng + dLng).toFixed(4) };
}
