import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

declare module 'hono/streaming' {
  interface StreamingApi {
    pipe(stream: NodeReadableStream<Uint8Array>): Promise<void>;
  }
}
