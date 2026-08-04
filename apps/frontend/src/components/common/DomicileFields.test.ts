import { describe, expect, it } from 'vitest';
import type { Address } from '@/lib/api/fetchAddresses';
import { formatAddressDisplay } from './AddressSearchField';
import { addressToDomicileValues } from './DomicileFields';

const makeAddress = (overrides: Partial<Address>): Address => ({
  id: 'id',
  label: '',
  type: 'housenumber',
  name: '',
  postcode: '',
  citycode: '',
  city: '',
  context: '',
  ...overrides,
});

describe('addressToDomicileValues', () => {
  it('fills only postcode and city for a municipality', () => {
    const address = makeAddress({
      type: 'municipality',
      name: 'Boulogne-Billancourt',
      postcode: '92100',
      city: 'Boulogne-Billancourt',
    });

    expect(addressToDomicileValues(address)).toEqual({
      adresseDomicile: '',
      codePostal: '92100',
      ville: 'Boulogne-Billancourt',
    });
  });

  it('fills all three fields for a housenumber', () => {
    const address = makeAddress({
      type: 'housenumber',
      name: '8 Rue de Magny',
      postcode: '77700',
      city: 'Bailly-Romainvilliers',
    });

    expect(addressToDomicileValues(address)).toEqual({
      adresseDomicile: '8 Rue de Magny',
      codePostal: '77700',
      ville: 'Bailly-Romainvilliers',
    });
  });

  it('fills all three fields for a street', () => {
    const address = makeAddress({ type: 'street', name: 'Rue de Boulogne', postcode: '59800', city: 'Lille' });

    expect(addressToDomicileValues(address)).toEqual({
      adresseDomicile: 'Rue de Boulogne',
      codePostal: '59800',
      ville: 'Lille',
    });
  });
});

describe('formatAddressDisplay', () => {
  it('shows postcode and city for a municipality', () => {
    const address = makeAddress({ type: 'municipality', postcode: '92100', city: 'Boulogne-Billancourt' });
    expect(formatAddressDisplay(address)).toBe('92100 Boulogne-Billancourt');
  });

  it('prepends the street for a housenumber', () => {
    const address = makeAddress({
      type: 'housenumber',
      name: '8 Rue de Magny',
      postcode: '77700',
      city: 'Bailly-Romainvilliers',
    });
    expect(formatAddressDisplay(address)).toBe('8 Rue de Magny, 77700 Bailly-Romainvilliers');
  });

  it('falls back to the name when there is no location', () => {
    const address = makeAddress({ type: 'street', name: 'Rue de Boulogne' });
    expect(formatAddressDisplay(address)).toBe('Rue de Boulogne');
  });
});
