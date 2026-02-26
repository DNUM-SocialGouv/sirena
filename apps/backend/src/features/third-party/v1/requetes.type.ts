import type { z } from 'zod';
import type { DeclarantSchema, SituationSchema, VictimeSchema } from './requetes.schema.js';

type ThirdPPartyDeclarant = z.infer<typeof DeclarantSchema>;
type ThirdPPartyVictime = z.infer<typeof VictimeSchema>;
type ThirdPartySituation = z.infer<typeof SituationSchema>;

export type CreateRequeteFromThirdPartyDto = {
  thirdPartyAccountId: string;
  receptionDate: Date;
  receptionTypeId: string;
  declarant: ThirdPPartyDeclarant;
  victime: ThirdPPartyVictime;
  situations: ThirdPartySituation[];
};
