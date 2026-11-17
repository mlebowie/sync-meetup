import { describe, expect, it } from 'vitest';
import {
  acceptGeocode,
  coordsFromPage,
  geocodeQuery,
  isVagueLocation,
} from '../../supabase/functions/_shared/geo';

describe('coordinates from an event page', () => {
  it('reads schema.org geo', () => {
    const html = `<script type="application/ld+json">{"@type":"Event","startDate":"2026-11-20T19:00",
      "location":{"@type":"Place","geo":{"@type":"GeoCoordinates","latitude":41.1496,"longitude":-8.6109}}}</script>`;
    expect(coordsFromPage(html)).toEqual({ lat: 41.1496, lng: -8.6109 });
  });

  it('reads quoted numbers', () => {
    const html = `{"latitude":"41.18","longitude":"-8.69"}`;
    expect(coordsFromPage(html)).toEqual({ lat: 41.18, lng: -8.69 });
  });

  it("falls back to the platform's venue lat/lng pair", () => {
    const html = `{"venue":{"name":"Bokkusu","lat":41.1489,"lng":-8.6062,"city":"Porto"}}`;
    expect(coordsFromPage(html)).toEqual({ lat: 41.1489, lng: -8.6062 });
  });

  it('accepts the same point repeated', () => {
    const html = `{"latitude":41.15,"longitude":-8.61} {"latitude":41.15,"longitude":-8.61}`;
    expect(coordsFromPage(html)).toEqual({ lat: 41.15, lng: -8.61 });
  });

  it('refuses a page with several places', () => {
    const html = `{"latitude":41.15,"longitude":-8.61} {"latitude":41.18,"longitude":-8.69}`;
    expect(coordsFromPage(html)).toBeNull();
  });

  it('refuses points outside the North of Portugal', () => {
    expect(coordsFromPage(`{"latitude":38.72,"longitude":-9.14}`)).toBeNull(); // Lisbon
    expect(coordsFromPage(`{"latitude":0,"longitude":0}`)).toBeNull();
  });

  it('returns null when there is nothing', () => {
    expect(coordsFromPage('<html><body>No data</body></html>')).toBeNull();
  });
});

describe('vague locations', () => {
  it.each(['Porto, Portugal', 'Porto', '', 'Vila Nova de Gaia, Portugal', '4000-001 Porto', 'Matosinhos, Porto, Portugal'])(
    '%j is vague',
    (loc) => expect(isVagueLocation(loc)).toBe(true),
  );

  it.each([
    'R. de Cedofeita 634, Porto',
    'Bokkusu Karaoke Box, R. do Bolhão 146, Porto',
    'Praça Dom João I, Porto',
    'Antiga Fábrica Vasco da Gama, Av. Menéres 657, 4450-102 Matosinhos',
    'The Social Hub Restaurant & Bar Porto, Porto, Portugal',
  ])('%j is specific', (loc) => expect(isVagueLocation(loc)).toBe(false));
});

describe('lookup text', () => {
  it('keeps the address after promotional venue text', () => {
    expect(
      geocodeQuery('Scoundrels Distilling Co - INVICTA GIN - MASTERCLASS - | Porto, Portugal, Scoundrels Distilling Co, Porto'),
    ).toBe('Porto, Portugal, Scoundrels Distilling Co, Porto');
  });

  it('adds the country', () => {
    expect(geocodeQuery('R. de Cedofeita 634, Porto')).toBe('R. de Cedofeita 634, Porto, Portugal');
  });
});

describe('lookup results', () => {
  it('keeps a specific place in the region', () => {
    expect(acceptGeocode({ lat: '41.1496', lon: '-8.6109', addresstype: 'amenity', class: 'amenity' })).toEqual({
      lat: 41.1496,
      lng: -8.6109,
    });
    expect(acceptGeocode({ lat: '41.15', lon: '-8.61', addresstype: 'square', class: 'place' })).not.toBeNull();
  });

  it('refuses a town or district', () => {
    expect(acceptGeocode({ lat: '41.15', lon: '-8.61', addresstype: 'city', class: 'boundary' })).toBeNull();
    expect(acceptGeocode({ lat: '41.15', lon: '-8.61', addresstype: 'suburb', class: 'place' })).toBeNull();
  });

  it('refuses a point outside the region or no result', () => {
    expect(acceptGeocode({ lat: '38.72', lon: '-9.14', addresstype: 'road' })).toBeNull();
    expect(acceptGeocode(undefined)).toBeNull();
  });
});
