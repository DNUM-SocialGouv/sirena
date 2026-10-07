type SupervisedWorker = {
  name: string;
  isRunning: () => boolean;
};

export type LivenessResult = { alive: true } | { alive: false; stoppedWorker: string };

export const createLivenessCheck = (workers: SupervisedWorker[]) => {
  const everStarted = new Set<string>();

  return (): LivenessResult => {
    for (const { name, isRunning } of workers) {
      if (isRunning()) {
        everStarted.add(name);
        continue;
      }
      if (everStarted.has(name)) {
        return { alive: false, stoppedWorker: name };
      }
    }

    return { alive: true };
  };
};
