import type { RootChampFragmentFragment } from '@/libs/graffle';

export class ChampMappingError extends Error {
  constructor(
    public readonly champ: RootChampFragmentFragment,
    public readonly type: string,
    public readonly message: string,
    public readonly cause?: string,
  ) {
    super(message);
    this.name = 'ChampMappingError';
  }
}

export class EnumNotFound extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'EnumNotFound';
  }
}
