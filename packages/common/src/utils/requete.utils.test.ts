import { describe, expect, it } from 'vitest';
import { isAutomaticRequest } from './requete.utils.js';

describe('isAutomaticRequest', () => {
  it('returns true for a request ingested from DematSocial', () => {
    expect(isAutomaticRequest({ dematSocialId: 123, sirecId: null, thirdPartyAccountId: null })).toBe(true);
  });

  it('returns true for a request migrated from SIREC', () => {
    expect(isAutomaticRequest({ dematSocialId: null, sirecId: 456, thirdPartyAccountId: null })).toBe(true);
  });

  it('returns true for a request created via the third-party API', () => {
    expect(isAutomaticRequest({ dematSocialId: null, sirecId: null, thirdPartyAccountId: 'tpa-1' })).toBe(true);
  });

  it('returns false for a manually created request', () => {
    expect(isAutomaticRequest({ dematSocialId: null, sirecId: null, thirdPartyAccountId: null })).toBe(false);
  });

  it('returns false for a manual request whose author account was deleted (no source id)', () => {
    // createdById SET NULL on user deletion must not be mistaken for an automatic request.
    expect(isAutomaticRequest({ dematSocialId: null, sirecId: null, thirdPartyAccountId: null })).toBe(false);
  });

  it('returns false for null or undefined', () => {
    expect(isAutomaticRequest(null)).toBe(false);
    expect(isAutomaticRequest(undefined)).toBe(false);
  });
});
