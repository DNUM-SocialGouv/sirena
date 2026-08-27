export type ChunkWriter = (chunk: string) => Promise<void>;

export class StreamCancelledError extends Error {
  constructor() {
    super('Stream cancelled by the consumer');
    this.name = 'StreamCancelledError';
  }
}

export function createTextStream(produce: (write: ChunkWriter) => Promise<void>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;
  let resumeProducer: (() => void) | undefined;

  const resume = () => {
    resumeProducer?.();
    resumeProducer = undefined;
  };

  return new ReadableStream({
    start(controller) {
      const write: ChunkWriter = async (chunk) => {
        if (cancelled) throw new StreamCancelledError();

        controller.enqueue(encoder.encode(chunk));
        if ((controller.desiredSize ?? 1) > 0) return;

        await new Promise<void>((resolve) => {
          resumeProducer = resolve;
        });
      };

      produce(write).then(
        () => {
          if (!cancelled) controller.close();
        },
        (error) => {
          if (!cancelled) controller.error(error);
        },
      );
    },
    pull: resume,
    cancel() {
      cancelled = true;
      resume();
    },
  });
}
