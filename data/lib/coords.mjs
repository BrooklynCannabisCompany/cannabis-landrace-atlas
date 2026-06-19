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
  'Ivory Coast': { lat: 7.5, lng: -5.5 },
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
  'Hawaii': { lat: 20.8, lng: -156.3 },
  'Alaska': { lat: 64.2, lng: -149.5 },
};

// Synonyms / alternate spellings normalized to a table key.
const COUNTRY_ALIASES = {
  'Hawaii, USA': 'Hawaii', 'French Caribbean': 'Martinique', 'Kosovo': 'Kosovo',
  'Czech Republic / Slovakia': 'Czech Republic', 'Republic of Congo': 'Congo'
};

// Sub-national region centroids: [regex for lowercased text, { lat, lng }]
// Ordered more-specific first. These are checked BEFORE the country centroid,
// so entries that mention e.g. "yunnan" land near Yunnan rather than China's centroid.
const SUBNATIONAL_RULES = [
  // China
  [/\byunnan\b|xishuangbanna|hengduan/,           { lat: 25.0, lng: 101.5 }],
  [/\bxinjiang\b|tarim|yarkand/,                  { lat: 41.0, lng: 85.0 }],
  [/\btibet\b|tibetan plateau/,                   { lat: 31.0, lng: 88.0 }],
  [/\bsichuan\b/,                                 { lat: 30.5, lng: 102.5 }],
  [/\bgansu\b/,                                   { lat: 37.5, lng: 102.0 }],
  [/\bqinghai\b/,                                 { lat: 35.5, lng: 96.0 }],
  [/\bheilongjiang\b/,                            { lat: 47.5, lng: 128.0 }],
  [/\bjilin\b/,                                   { lat: 43.5, lng: 126.5 }],
  // Russia
  [/\bsiberia\b/,                                 { lat: 60.0, lng: 90.0 }],
  [/\baltai\b/,                                   { lat: 51.0, lng: 86.0 }],
  [/\bural\b/,                                    { lat: 57.0, lng: 60.0 }],
  [/\bvolga\b/,                                   { lat: 50.0, lng: 45.0 }],
  [/\bcaucasus\b/,                                { lat: 43.0, lng: 44.0 }],
  [/\bamur\b/,                                    { lat: 53.0, lng: 127.0 }],
  [/\bprimorsky\b/,                               { lat: 45.0, lng: 135.0 }],
  [/\blena\b/,                                    { lat: 62.0, lng: 120.0 }],
  [/\byenisei\b/,                                 { lat: 58.0, lng: 92.0 }],
  [/\bob river\b/,                                { lat: 60.0, lng: 75.0 }],
  [/\bburyatia\b/,                               { lat: 53.0, lng: 108.0 }],
  [/\btuva\b/,                                    { lat: 51.7, lng: 94.5 }],
  [/\bsayan\b/,                                   { lat: 53.0, lng: 93.0 }],
  [/\btrans.baikal\b/,                            { lat: 52.0, lng: 113.0 }],
  [/\bbashkortostan\b/,                           { lat: 54.0, lng: 56.0 }],
  [/\bdagestan\b/,                                { lat: 43.0, lng: 47.0 }],
  [/russian far east|sea of japan coast/,         { lat: 45.0, lng: 135.0 }],
  // USA
  [/\balaska\b|\balaskan\b/,                      { lat: 64.2, lng: -149.5 }],
  [/\bhawaii\b|\bhawaiian\b/,                     { lat: 20.8, lng: -156.3 }],
  [/\bappalachia\b|\bappalachian\b/,              { lat: 37.5, lng: -81.0 }],
  [/california.*heirloom|\bcalifornia\b/,         { lat: 37.0, lng: -120.0 }],
  [/florida everglades|\bflorida\b/,              { lat: 28.0, lng: -81.5 }],
  [/midwest prairie|\bmidwest\b/,                 { lat: 41.5, lng: -93.0 }],
  [/oregon cascadia|\boregon\b/,                  { lat: 44.0, lng: -120.5 }],
  [/rio grande|texas rio grande/,                 { lat: 26.5, lng: -99.0 }],
  [/\btexas\b/,                                   { lat: 31.0, lng: -99.0 }],
  // Canada
  [/british columbia/,                            { lat: 53.7, lng: -125.0 }],
  [/\bprairie\b|canadian prairie/,                { lat: 52.0, lng: -106.0 }],
  [/northern ontario|\bontario\b/,                { lat: 49.0, lng: -85.0 }],
  [/northern quebec|\bquebec\b/,                  { lat: 52.0, lng: -72.0 }],
  // Australia
  [/cape york/,                                   { lat: -13.5, lng: 142.5 }],
  [/northern territory/,                          { lat: -19.0, lng: 133.0 }],
  [/northern queensland|\bqueensland\b/,          { lat: -20.0, lng: 144.0 }],
  // Brazil
  [/\bacre\b/,                                    { lat: -9.0, lng: -70.0 }],
  [/\bamazon\b/,                                  { lat: -4.0, lng: -62.0 }],
  [/\bcerrado\b/,                                 { lat: -15.0, lng: -48.0 }],
  [/\brondonia\b/,                                { lat: -11.0, lng: -63.0 }],
  [/\bpernambuco\b/,                              { lat: -8.3, lng: -37.0 }],
  // Colombia
  [/sierra nevada de santa marta|\bsanta marta\b/, { lat: 11.0, lng: -73.9 }],
  [/\bcauca\b/,                                   { lat: 2.5, lng: -76.8 }],
  [/\bantioquia\b/,                               { lat: 6.5, lng: -75.5 }],
  [/\bhuila\b/,                                   { lat: 2.5, lng: -75.5 }],
  [/\bnarino\b|\bnariño\b/,                       { lat: 1.2, lng: -77.3 }],
  [/\bputumayo\b/,                                { lat: 0.4, lng: -76.0 }],
  [/colombian amazonas|\bamazonas\b.*colombia|colombia.*\bamazonas\b/, { lat: -1.0, lng: -71.5 }],
  [/\bboyaca\b|\bboyacá\b/,                       { lat: 5.5, lng: -73.4 }],
  // Peru
  [/\bucayali\b/,                                 { lat: -8.4, lng: -74.5 }],
  [/madre de dios/,                               { lat: -12.0, lng: -70.0 }],
  [/\bhuallaga\b/,                                { lat: -7.0, lng: -76.5 }],
  [/\bmontana\b.*peru|peru.*\bmontana\b/,         { lat: -11.0, lng: -74.0 }],
  // India
  [/\bkashmir\b/,                                 { lat: 34.0, lng: 75.0 }],
  [/\bhimachal\b/,                                { lat: 31.8, lng: 77.2 }],
  [/\bkullu\b/,                                   { lat: 32.0, lng: 77.1 }],
  [/parvati valley|\bparvati\b/,                  { lat: 32.0, lng: 77.6 }],
  [/\bmalana\b/,                                  { lat: 32.05, lng: 77.4 }],
  [/\bladakh\b/,                                  { lat: 34.2, lng: 77.6 }],
  [/\bspiti\b/,                                   { lat: 32.2, lng: 78.0 }],
  [/\bkerala\b/,                                  { lat: 10.5, lng: 76.5 }],
  [/\bsikkim\b/,                                  { lat: 27.5, lng: 88.5 }],
  [/\barunachal\b/,                               { lat: 28.0, lng: 94.5 }],
  [/\bgarhwal\b/,                                 { lat: 30.2, lng: 79.0 }],
  // India — Himachal Pradesh villages (Parvati-adjacent; all in the Kullu/Himachal belt)
  [/\bbarot\b|\bchamba\b|\bkinnaur\b|\bpangi\b|\brasol\b|\btosh\b|\bwaichin\b|\bzanskar\b|\bnanda devi\b/,
                                                  { lat: 32.0, lng: 77.5 }],
  [/\bkumaon\b|\bkumaoni\b/,                      { lat: 29.6, lng: 79.6 }],
  [/\bnagaland\b/,                                { lat: 26.0, lng: 94.5 }],
  [/\bmanipur\b|\bmanipuri\b/,                    { lat: 24.8, lng: 93.9 }],
  [/\bidukki\b/,                                  { lat: 9.8, lng: 77.0 }],
  [/\borissa\b|\bodisha\b/,                       { lat: 20.5, lng: 84.5 }],
  // Indonesia
  [/\baceh\b/,                                    { lat: 4.5, lng: 96.8 }],
  [/\bborneo\b|\bkalimantan\b/,                   { lat: 0.0, lng: 114.0 }],
  [/\bsulawesi\b/,                                { lat: -2.0, lng: 120.5 }],
  [/\bsumatra\b/,                                 { lat: 0.0, lng: 101.5 }],
  [/flores island|\bflores\b/,                    { lat: -8.6, lng: 121.0 }],
  [/\bbali\b/,                                    { lat: -8.4, lng: 115.1 }],
  [/\bmaluku\b/,                                  { lat: -3.1, lng: 129.4 }],
  // PNG provinces
  [/\bchimbu\b/,                                  { lat: -6.0, lng: 144.9 }],
  [/eastern highlands/,                           { lat: -6.3, lng: 145.4 }],
  [/\benga\b/,                                    { lat: -5.3, lng: 143.6 }],
  [/western highlands/,                           { lat: -5.8, lng: 144.2 }],
  [/\bhela\b/,                                    { lat: -5.9, lng: 142.9 }],
  [/gulf province|\bgulf\b.*png|png.*\bgulf\b/,   { lat: -7.8, lng: 144.8 }],
  [/\bmorobe\b/,                                  { lat: -6.5, lng: 146.7 }],
  [/\bmadang\b/,                                  { lat: -5.2, lng: 145.8 }],
  [/\bsepik\b/,                                   { lat: -4.0, lng: 142.5 }],
  [/new britain/,                                 { lat: -5.5, lng: 150.5 }],
  [/new ireland/,                                 { lat: -3.3, lng: 152.0 }],
  [/manus island|\bmanus\b/,                      { lat: -2.1, lng: 147.0 }],
  [/buka island|\bbuka\b/,                        { lat: -5.4, lng: 154.7 }],
  [/\bbougainville\b/,                            { lat: -6.2, lng: 155.2 }],
  // Thailand
  [/chiang mai/,                                  { lat: 18.8, lng: 99.0 }],
  [/chiang rai/,                                  { lat: 19.9, lng: 99.8 }],
  [/\bisan\b/,                                    { lat: 16.0, lng: 103.0 }],
  [/\bphuket\b/,                                  { lat: 7.9, lng: 98.4 }],
  // Nepal
  [/\bmustang\b/,                                 { lat: 28.9, lng: 83.8 }],
  [/\bdolpo\b/,                                   { lat: 29.0, lng: 83.0 }],
  [/\bhumla\b/,                                   { lat: 30.0, lng: 81.8 }],
  [/\bjumla\b/,                                   { lat: 29.3, lng: 82.2 }],
  [/nepal terai|\bterai\b/,                       { lat: 27.0, lng: 84.5 }],
  [/\bkarnali\b/,                                 { lat: 29.3, lng: 82.2 }],
  // Ethiopia
  [/\bshashamane\b/,                              { lat: 7.2, lng: 38.6 }],
  [/\bsimien\b/,                                  { lat: 13.2, lng: 38.2 }],
  [/rift valley corridor|rift valley/,            { lat: 8.0, lng: 39.0 }],
  [/\bbale\b/,                                    { lat: 6.8, lng: 39.8 }],
  // New Zealand
  [/\bcoromandel\b/,                              { lat: -36.8, lng: 175.6 }],
  [/\bnorthland\b/,                               { lat: -35.5, lng: 174.0 }],
  [/south island/,                                { lat: -44.0, lng: 170.5 }],
  [/\bauckland\b/,                                { lat: -36.9, lng: 174.8 }],
  [/bay of plenty/,                               { lat: -37.7, lng: 176.5 }],
];

/**
 * Given a lowercased combined text, returns a sub-national base coordinate
 * if any SUBNATIONAL_RULES keyword matches, else null.
 */
function resolveSubnational(lowerText) {
  for (const [re, coord] of SUBNATIONAL_RULES) {
    if (re.test(lowerText)) return coord;
  }
  return null;
}

/**
 * Resolves a raw country string to a recognized key in COUNTRY_CENTROIDS.
 * Exported for use in resolveCountryName.
 */
export function resolveCountryKey(countryRaw) {
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

// Keyword-to-country inference rules (ordered, more specific first).
// Each entry: [regex applied to lowercased combined text, countryKey in COUNTRY_CENTROIDS].
const INFER_RULES = [
  // Must come before shorter overlapping patterns
  // Africa — specific
  [/réunion|zamal/,                     'Réunion'],
  [/ivory coast/,                       'Ivory Coast'],
  [/sierra leone/,                      'Sierra Leone'],
  [/south africa|southern africa|cape wild|eastern cape|pondoland|transkei|durban/i, 'South Africa'],
  [/swazi/,                             'Eswatini'],
  [/lesotho/,                           'Lesotho'],
  [/zimbabwe|mashonaland/,              'Zimbabwe'],
  [/namibia|namibian/,                  'Namibia'],
  [/malawi/,                            'Malawi'],
  [/madagascar/,                        'Madagascar'],
  [/cameroon/,                          'Cameroon'],
  [/sangha basin|congo basin|central african rainforest/i, 'DRC'],
  [/gabon/,                             'Gabon'],
  [/angola|angolan/,                    'Angola'],
  [/ethiopia|ethiopian|rift valley corridor/i, 'Ethiopia'],
  [/tanzania|tanzanian/,                'Tanzania'],
  [/uganda|lake victoria/,              'Uganda'],
  [/nigeria|nigerian/,                  'Nigeria'],
  [/kenya/,                             'Kenya'],
  // Middle East / Central Asia
  [/afghani|badakhshan|balkh|nuristan|lashkar|mazar/i, 'Afghanistan'],
  [/iranian|sinai.*persia/i,            'Iran'],
  [/sinai/,                             'Egypt'],
  [/ketama|moroccan rif|rif/,           'Morocco'],
  [/lebanese/,                          'Lebanon'],
  [/syrian/,                            'Syria'],
  [/khyber|tirah|chitral|karakoram|northern pakistan/i, 'Pakistan'],
  [/ferghana/,                          'Uzbekistan'],
  [/fann mountains/,                    'Tajikistan'],
  [/kazakh|semirechye|seven rivers/i,   'Kazakhstan'],
  [/kyrgyz|tian shan/,                  'Kyrgyzstan'],
  [/turkestan/,                         'Uzbekistan'],
  [/uzbekistan/,                        'Uzbekistan'],
  [/altai|siberia|trans.baikal|russian ruderalis|bashkortostan|volga|ural|russian far east|sea of japan coast/i, 'Russia'],
  [/anatolian|turkey interior/,         'Turkey'],
  [/mongolian steppe|mongolia/,         'Mongolia'],
  // South Asia
  [/parvati valley/,                    'India'],
  [/nepalese|nepal terai|nepal/i,       'Nepal'],
  // Southeast Asia
  [/bali|lombok|borneo|kalimantan|flores island|sulawesi|sumatra/i, 'Indonesia'],
  [/timor/,                             'Timor-Leste'],
  [/cambodian|cambodia/,                'Cambodia'],
  [/golden triangle/,                   'Laos'],
  [/hmong/,                             'Laos'],
  [/vietnam/,                           'Vietnam'],
  // East Asia
  [/xishuangbanna|yunnan|sichuan|gansu|heilongjiang|jilin|qinghai|tibetan plateau|xinjiang|yarkand/i, 'China'],
  [/japanese hemp|japan/i,              'Japan'],
  [/north korea/,                       'North Korea'],
  [/korean native|south korea/,         'South Korea'],
  // Europe
  [/albanian/,                          'Albania'],
  [/balkan|southeastern europe/i,       'Serbia'],
  [/cretan|crete/,                      'Greece'],
  [/danube basin|central.*eastern europe|hungarian/i, 'Hungary'],
  [/french corsica|corsica/,            'France'],
  [/italian calabria|calabria/,         'Italy'],
  [/portuguese algarve|algarve/,        'Portugal'],
  [/spanish sierra nevada/,             'Spain'],
  [/caucasus feral|georgia/,            'Georgia'],
  // Oceania / Pacific
  [/papua new guinea|png|chimbu|eastern highlands|enga|gulf province|hela|madang|morobe|sepik|new guinea|buka island|manus island|new britain|new ireland/i, 'Papua New Guinea'],
  [/fiji/,                              'Fiji'],
  [/solomon islands/,                   'Solomon Islands'],
  [/tahiti|french polynesia/,           'French Polynesia'],
  [/vanuatu/,                           'Vanuatu'],
  [/northland feral|new zealand/,       'New Zealand'],
  [/australian|cape york|northern territory|northern queensland/i, 'Australia'],
  // Americas
  [/alaskan/,                           'Alaska'],
  [/appalachian|california.*heirloom|florida everglades|midwest prairie|oregon cascadia|texas rio grande/i, 'United States'],
  [/hawaiian|hawaii/,                   'Hawaii'],
  [/british columbia|canadian prairie|northern ontario|northern quebec/i, 'Canada'],
  [/bolivian yungas|bolivia/,           'Bolivia'],
  [/colombian|colombia|sierra nevada de santa marta|llanos/i, 'Colombia'],
  [/ecuador|ecuadorian/,                'Ecuador'],
  [/guatemala/,                         'Guatemala'],
  [/honduras/,                          'Honduras'],
  [/mexican|mexico/,                    'Mexico'],
  [/panama|darién|darien/,              'Panama'],
  [/peruvian|peru/,                     'Peru'],
  [/venezuela/,                         'Venezuela'],
  [/brazilian|brazil/,                  'Brazil'],
];

/**
 * Scans a lowercased combined text against the ordered inference rules and
 * returns the first matching country key present in COUNTRY_CENTROIDS, or null.
 */
export function inferCountry(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [re, key] of INFER_RULES) {
    if (re.test(lower) && COUNTRY_CENTROIDS[key]) return key;
  }
  return null;
}

/**
 * Returns the best human-readable country name (a key of COUNTRY_CENTROIDS) for display.
 * Resolution order: recognized country from countryRaw → inference from combined text → null.
 */
export function resolveCountryName({ countryRaw, regionRaw, name }) {
  // 1. Try direct recognition of countryRaw (including multi-country first-token logic)
  const direct = resolveCountryKey(countryRaw);
  if (direct) return direct;
  // 2. Infer from combined text
  const combined = [countryRaw, name, regionRaw].filter(Boolean).join(' ');
  return inferCountry(combined);
}

export function resolveCoords({ countryRaw, regionRaw, name, id }) {
  const combined = [countryRaw, name, regionRaw].filter(Boolean).join(' ');
  const lower = combined.toLowerCase();

  let base = null;
  // 1. Explicit region override
  if (regionRaw && REGION_OVERRIDES[regionRaw]) base = REGION_OVERRIDES[regionRaw];
  // 2. Check sub-national centroids from the combined text (more specific than country centroid)
  if (!base) base = resolveSubnational(lower);
  // 3. Resolve from parenthetical country
  if (!base) {
    const key = resolveCountryKey(countryRaw);
    if (key) base = COUNTRY_CENTROIDS[key];
  }
  // 4. Infer country from combined text
  if (!base) {
    const inferred = inferCountry(combined);
    if (inferred) base = COUNTRY_CENTROIDS[inferred];
  }
  if (!base) return null;
  const { dLat, dLng } = jitter(id || regionRaw || countryRaw || 'seed');
  return { lat: +(base.lat + dLat).toFixed(4), lng: +(base.lng + dLng).toFixed(4) };
}
