import { SirecTranscoError } from './sirecTransco.error.js';

interface ServiceArsEntry {
  arsEntiteId: string;
  serviceEntiteIds: string[];
}

const ARS_NORMANDIE = '4af829ff-07c1-425d-85d6-83b5f97e4422';

const ARS_TRANSCO: Record<number, string> = {
  667: '4988789e-9775-4958-861f-52f03cbc9257',
  669: 'aaab82ff-ccda-4fc6-9edc-b8cce4a5c893',
  671: '255bb728-6545-49cc-ab70-b26f254f9938',
  673: '255bb728-6545-49cc-ab70-b26f254f9938',
  675: '0705838b-4a21-4e34-ab5d-a574879ae3aa',
  677: '359e7f37-7344-4680-8b78-3101a01b073c',
  679: 'fba90144-1561-4fc6-b3ce-5850ee796e47',
  681: '543fa06b-141f-4cfc-ace9-dbb334734652',
  683: '991e33cf-0935-4327-b52a-f38a9cb698b5',
  685: '991e33cf-0935-4327-b52a-f38a9cb698b5',
  687: 'e30f5f2d-de67-4e46-a0a0-db7fc1d54337',
  689: '6fd0050e-79c9-4180-b9b8-84c6c4291051',
  691: 'e0b00e40-474d-42da-955b-0b315226e181',
  693: ARS_NORMANDIE,
  695: 'f6ad274f-cc6c-4c88-9524-de9a9c9b2127',
  697: 'e9ed1e3a-3a32-4078-9109-2c83c12c4faf',
  699: '264e399d-81a0-416d-a8da-8d6f4465e632',
  701: 'acf617c0-892a-4af1-a757-125409ffccdd',
};

const SERVICES_ARS_TRANSCO: Record<number, ServiceArsEntry> = {
  1087: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['7f2a9b1c-4d3e-4a8f-b6c5-8e1d0f2a3b4c'] },
  1089: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['cc18d397-8c47-4576-aec9-a0f8edcd37a5'] },
  1091: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['ebf8af6d-0395-481b-bbb1-adc150b9f00c'] },
  1093: {
    arsEntiteId: ARS_NORMANDIE,
    serviceEntiteIds: ['f7e2a9c5-4b8d-4e16-9f0a-3d6c2b8e1f7a', '8d4b1e6f-a3c9-4f72-b5d0-1e9a7c4f2b8d'],
  },
  1095: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['c6d2f8a4-1e9b-4c73-b5a0-8d2f6e1c9b4a'] },
  1097: {
    arsEntiteId: ARS_NORMANDIE,
    serviceEntiteIds: [
      '4c7a2e9b-6d1f-4a58-c0e3-2b9f5d8a1c7e',
      'd9e3b6a1-8f4c-4e27-9d0b-5a2f7c1e8d4b',
      '6a1f4c8e-2b9d-4f53-a7e0-8c3b6d2f9a1e',
      'e2b9d7f4-1a6c-4b83-9e0d-7f5a2c8b3e61',
      'b1f8d3e6-9a2c-4f75-8b0d-4e7a1c9f3b62',
    ],
  },
  1099: {
    arsEntiteId: ARS_NORMANDIE,
    serviceEntiteIds: [
      'ef054f07-d2e7-4f41-8111-6339f9258ea8',
      'c39a7e7e-6051-4fdf-9b1b-217901607206',
      '9bb2e5c5-745e-47e9-9274-839226f02e7f',
      'f0ea8b04-139e-45bd-bbb7-9f02857c4f42',
      '470577a9-7dbb-4aee-a38d-0082d2796a61',
    ],
  },
  1101: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['eeb56130-5e3b-40af-9fe2-4b2ea804f150'] },
  1103: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['a85bedd3-e29f-4732-bc21-fa3fe7af93bd'] },
  1105: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['dc1fe975-28fd-490d-be5b-814a5bdd9c6b'] },
  1107: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['a85bedd3-e29f-4732-bc21-fa3fe7af93bd'] },
  1109: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['dc1fe975-28fd-490d-be5b-814a5bdd9c6b'] },
  1111: {
    arsEntiteId: ARS_NORMANDIE,
    serviceEntiteIds: [
      '4c7a2e9b-6d1f-4a58-c0e3-2b9f5d8a1c7e',
      'd9e3b6a1-8f4c-4e27-9d0b-5a2f7c1e8d4b',
      '6a1f4c8e-2b9d-4f53-a7e0-8c3b6d2f9a1e',
      'e2b9d7f4-1a6c-4b83-9e0d-7f5a2c8b3e61',
      'b1f8d3e6-9a2c-4f75-8b0d-4e7a1c9f3b62',
    ],
  },
  1113: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['7f2a9b1c-4d3e-4a8f-b6c5-8e1d0f2a3b4c'] },
  1115: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['c773bd6f-73e8-479c-b552-fd72f91c2efb'] },
  1117: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['67d848fb-9163-48a5-bca5-3b2f3317c64b'] },
  1119: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['23bd3315-d051-42c1-8440-a6a929810037'] },
  1121: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['7e73c105-f924-4506-a4bb-edcb5787b72c'] },
  1123: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['9effb763-89e9-455d-9db9-da0aa28aedb3'] },
  1125: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['0952edd3-8cd2-4fc0-8d14-03243cecd0a3'] },
  1127: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['b1f8d3e6-9a2c-4f75-8b0d-4e7a1c9f3b62'] },
  1129: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['4c7a2e9b-6d1f-4a58-c0e3-2b9f5d8a1c7e'] },
  1131: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['d9e3b6a1-8f4c-4e27-9d0b-5a2f7c1e8d4b'] },
  1133: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['6a1f4c8e-2b9d-4f53-a7e0-8c3b6d2f9a1e'] },
  1135: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['e2b9d7f4-1a6c-4b83-9e0d-7f5a2c8b3e61'] },
  1137: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['470577a9-7dbb-4aee-a38d-0082d2796a61'] },
  1139: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['ef054f07-d2e7-4f41-8111-6339f9258ea8'] },
  1141: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['c39a7e7e-6051-4fdf-9b1b-217901607206'] },
  1143: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['9bb2e5c5-745e-47e9-9274-839226f02e7f'] },
  1145: { arsEntiteId: ARS_NORMANDIE, serviceEntiteIds: ['f0ea8b04-139e-45bd-bbb7-9f02857c4f42'] },
};

export interface AffectationEntites {
  requeteEntiteIds: string[];
  situationEntiteIds: string[];
}

export function filterArsEntiteIds(entiteIds: string[]): string[] {
  const arsEntiteIdSet = new Set(Object.values(ARS_TRANSCO));
  return entiteIds.filter((id) => arsEntiteIdSet.has(id));
}

export function transcodeAffectation(idSirec: number): AffectationEntites {
  const arsEntiteId = ARS_TRANSCO[idSirec];
  if (arsEntiteId !== undefined) {
    return { requeteEntiteIds: [arsEntiteId], situationEntiteIds: [] };
  }

  const serviceEntry = SERVICES_ARS_TRANSCO[idSirec];
  if (serviceEntry !== undefined) {
    return {
      requeteEntiteIds: [serviceEntry.arsEntiteId],
      situationEntiteIds: [...serviceEntry.serviceEntiteIds, serviceEntry.arsEntiteId],
    };
  }

  throw new SirecTranscoError(idSirec, 'affectation');
}
