import { describe, expect, it } from 'vitest';
import { transcodeVictimeAge } from './victimeAge.transco.js';

describe('victimeAge.transco.ts', () => {
  it('should return null when age is null', () => {
    expect(transcodeVictimeAge(null)).toBeNull();
  });

  it('should return null when age is negative', () => {
    expect(transcodeVictimeAge(-1)).toBeNull();
  });

  it('should return "-18" for age 0', () => {
    expect(transcodeVictimeAge(0)).toBe('-18');
  });

  it('should return "-18" for age 17', () => {
    expect(transcodeVictimeAge(17)).toBe('-18');
  });

  it('should return "18-29" for age 18', () => {
    expect(transcodeVictimeAge(18)).toBe('18-29');
  });

  it('should return "18-29" for age 29', () => {
    expect(transcodeVictimeAge(29)).toBe('18-29');
  });

  it('should return "30-59" for age 30', () => {
    expect(transcodeVictimeAge(30)).toBe('30-59');
  });

  it('should return "30-59" for age 59', () => {
    expect(transcodeVictimeAge(59)).toBe('30-59');
  });

  it('should return "60-79" for age 60', () => {
    expect(transcodeVictimeAge(60)).toBe('60-79');
  });

  it('should return "60-79" for age 79', () => {
    expect(transcodeVictimeAge(79)).toBe('60-79');
  });

  it('should return ">= 80" for age 80', () => {
    expect(transcodeVictimeAge(80)).toBe('>= 80');
  });

  it('should return ">= 80" for age 150', () => {
    expect(transcodeVictimeAge(150)).toBe('>= 80');
  });
});
