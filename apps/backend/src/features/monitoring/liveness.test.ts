import { describe, expect, it } from 'vitest';
import { createLivenessCheck } from './liveness.js';

const worker = (name: string, running: () => boolean) => ({ name, isRunning: running });

describe('createLivenessCheck', () => {
  it('reports alive while every worker runs', () => {
    const check = createLivenessCheck([worker('cron', () => true), worker('file-processing', () => true)]);

    expect(check()).toEqual({ alive: true });
  });

  it('reports alive for a worker that has not started yet', () => {
    const check = createLivenessCheck([worker('cron', () => false)]);

    expect(check()).toEqual({ alive: true });
    expect(check()).toEqual({ alive: true });
  });

  it('reports dead once a worker that had started stops running', () => {
    let running = false;
    const check = createLivenessCheck([worker('cron', () => running)]);

    expect(check()).toEqual({ alive: true });

    running = true;
    expect(check()).toEqual({ alive: true });

    running = false;
    expect(check()).toEqual({ alive: false, stoppedWorker: 'cron' });
  });

  it('names the stopped worker among several', () => {
    let fileProcessingRunning = true;
    const check = createLivenessCheck([
      worker('cron', () => true),
      worker('file-processing', () => fileProcessingRunning),
      worker('sirec-migration', () => true),
    ]);

    expect(check()).toEqual({ alive: true });

    fileProcessingRunning = false;
    expect(check()).toEqual({ alive: false, stoppedWorker: 'file-processing' });
  });

  it('keeps reporting dead on every later call', () => {
    let running = true;
    const check = createLivenessCheck([worker('cron', () => running)]);
    check();

    running = false;

    expect(check()).toEqual({ alive: false, stoppedWorker: 'cron' });
    expect(check()).toEqual({ alive: false, stoppedWorker: 'cron' });
  });

  it('reports alive when no worker is supervised', () => {
    expect(createLivenessCheck([])()).toEqual({ alive: true });
  });
});
