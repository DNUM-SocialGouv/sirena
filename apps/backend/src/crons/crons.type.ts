type State = 'success' | 'error' | 'timeout';

export type StartCronParams = { name: string; startedAt: Date; params: Record<string, unknown> };
export type EndCronParams = {
  id: string;
  state: State;
  result?: Record<string, unknown>;
  endedAt: Date;
};
