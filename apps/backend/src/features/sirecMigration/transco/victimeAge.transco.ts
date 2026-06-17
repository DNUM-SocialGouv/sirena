import { AGE } from '@sirena/common/constants';

export function transcodeVictimeAge(age: number | null): string | null {
  if (age === null || age < 0) return null;
  if (age < 18) return AGE['-18'];
  if (age < 30) return AGE['18-29'];
  if (age < 60) return AGE['30-59'];
  if (age < 80) return AGE['60-79'];
  return AGE['>= 80'];
}
