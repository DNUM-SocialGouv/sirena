import { describe, expect, it } from 'vitest';
import { createTextStream } from './stream.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

const produceChunks = (chunks: string[], produced: string[]) =>
  createTextStream(async (write) => {
    for (const chunk of chunks) {
      await write(chunk);
      produced.push(chunk);
    }
  });

describe('createTextStream', () => {
  it('concatenates the produced chunks, BOM included', async () => {
    const stream = createTextStream(async (write) => {
      await write('﻿a;b');
      await write('\n1;2');
    });

    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes)).toBe('﻿a;b\n1;2');
  });

  it('rejects the consumer when the producer throws, instead of truncating silently', async () => {
    const stream = createTextStream(async (write) => {
      await write('a;b');
      throw new Error('page read failed');
    });

    await expect(new Response(stream).text()).rejects.toThrow('page read failed');
  });

  it('suspends the producer while the consumer has not drained the queue', async () => {
    const produced: string[] = [];
    const reader = produceChunks(['1', '2', '3', '4', '5'], produced).getReader();

    await tick();
    expect(produced.length).toBeLessThan(2);

    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe('1');
    await reader.cancel();
  });

  it('stops the producer when the consumer cancels', async () => {
    const produced: string[] = [];
    const reader = produceChunks(['1', '2', '3', '4', '5'], produced).getReader();

    await reader.read();
    await reader.cancel();
    const producedOnCancel = produced.length;

    await tick();
    expect(produced).toEqual(produced.slice(0, producedOnCancel));
    expect(produced).not.toContain('5');
  });
});
