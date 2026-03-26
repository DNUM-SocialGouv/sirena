-- Rollback: delete CD/DDETS Normandie entities created by this migration
-- Order: services (children) first, then pôles/directions (to respect FKs)
DELETE FROM "Entite" WHERE "id" IN (
  -- Services under Pôle cohésion sociale (DDETS76)
  'aa5aadfd-bf2b-474a-be7c-d599bde684b8',
  'c54d15f7-f3d1-4421-9a74-ea0914826e05',
  '587995af-f87b-4d2f-9314-3970c3103409',
  '48ec5c18-f0b0-464b-b923-9d5dd4dc76a2',
  '65732394-d1b1-4448-b308-f15cb5f1fbe4',
  -- Service under Pôle travail (DDETS76)
  'ebd65e58-8d6f-46a6-88dd-30bb1ba9d067',
  -- Units and services under Pôle travail (DDETS76)
  'c61ae0bb-0716-423d-b8a5-ff13fe0981de',
  '23cd45b4-605d-473d-ad7c-7c69503eec93',
  '05d88815-3275-4691-897f-2450289ac7e0',
  'd1a7b61e-af98-4e00-9777-b8dd18c5502b',
  '1e57fa6d-89e4-4160-83f4-caf761a1cdcd',
  -- DDETS76 pôles
  '68845bba-1239-4c2e-8844-878a523ec4fc',
  '35c25d16-9d21-42a3-a423-837f5de7ce4c',
  'ff9b5c72-ee32-40fb-b447-47d5c73f6a7a',
  -- Directions under DDETS50
  '951e138c-82ff-4aeb-9c1c-b5c0c80bd0fa',
  'cd2236b5-c2c7-4f23-a4b2-9494d23eb753',
  -- Directions under CD
  '0049bded-e34d-4b85-b1fa-786198aecf81',
  '0952edd3-8cd2-4fc0-8d14-03243cecd0a3'
);
