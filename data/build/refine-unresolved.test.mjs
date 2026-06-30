import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenAdmin1, flattenCities } from './fetch-ne-gazetteer.mjs';

test('flattenAdmin1 maps name/admin/latitude/longitude and skips incomplete', () => {
  const gj = { features: [
    { properties: { name: 'Badakhshan', admin: 'Afghanistan', latitude: 36.7, longitude: 70.8 } },
    { properties: { name: 'NoCoords', admin: 'Nowhere' } },
  ] };
  const out = flattenAdmin1(gj);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { name: 'Badakhshan', lat: 36.7, lng: 70.8, country: 'Afghanistan', src: 'ne-admin1' });
});

test('flattenCities maps NAME/ADM0NAME/LATITUDE/LONGITUDE', () => {
  const gj = { features: [
    { properties: { NAME: 'Herat', ADM0NAME: 'Afghanistan', LATITUDE: 34.33, LONGITUDE: 62.17 } },
  ] };
  const out = flattenCities(gj);
  assert.deepEqual(out[0], { name: 'Herat', lat: 34.33, lng: 62.17, country: 'Afghanistan', src: 'ne-city' });
});
