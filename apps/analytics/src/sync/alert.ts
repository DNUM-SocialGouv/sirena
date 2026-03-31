export type DriftResult = {
  isDrift: boolean;
  pct: number;
};

export function checkDrift(sourceCount: number, analyticsCount: number, threshold: number): DriftResult {
  if (sourceCount === 0) return { isDrift: false, pct: 0 };
  const pct = (Math.abs(sourceCount - analyticsCount) / sourceCount) * 100;
  return { isDrift: pct > threshold, pct };
}
