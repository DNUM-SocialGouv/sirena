import type { RootChampFragmentFragment } from '../../libs/graffle.js';
import type { RepetitionChamp } from './dematSocial.type.js';

export class ChampMappingError extends Error {
  public readonly champId?: string;
  public readonly champTypename?: string;

  constructor(
    public readonly champ: RootChampFragmentFragment | RepetitionChamp,
    public readonly type: string,
    public readonly message: string,
    public readonly cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'ChampMappingError';
    this.champId = 'id' in champ ? champ.id : undefined;
    this.champTypename = '__typename' in champ ? champ.__typename : undefined;
  }
}

export class EnumNotFound extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'EnumNotFound';
  }
}
