import { describe, expect, it } from 'vitest';
import { WARNING_BANNER_CONTENT } from './warningBannerContent';

describe('warningBannerContent', () => {
  it('announces the technical migration of 5 November', () => {
    expect(WARNING_BANNER_CONTENT.title).toBe(
      'Migration technique jeudi 5 novembre à 14h : SIRENA sera indisponible pendant quelques heures.',
    );
    expect(WARNING_BANNER_CONTENT.description).toBe('Merci d’anticiper cette interruption dans votre organisation.');
  });
});
