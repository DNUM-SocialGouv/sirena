INSERT INTO "public"."Entite" ("id","nomComplet","label","email","emailDomain","organizationalUnit","isActive","entiteTypeId","entiteMereId","ctcdCode","regionCode","regLib","dptLib")
VALUES
    ('8f5fbdac-0807-41c6-bb96-c834b9a2d803','Direction de l''offre de soins','DOS','','','',false,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."Entite" ("id","nomComplet","label","email","emailDomain","organizationalUnit","isActive","entiteTypeId","entiteMereId", "ctcdCode","regionCode","regLib","dptLib")
VALUES
    ('0e19e1a7-f3cd-4793-932a-e4b1225b72c9','Délégation départementale du Nord','Délégation départementale du Nord','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('d87c7c1f-6778-4eb6-8d87-7a8b7eb15b81','Délégation départementale du Pas-de-Calais','Délégation départementale du Pas-de-Calais','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('6201a7b8-4feb-439f-bb70-d20559497798','Délégation départementale de l''Oise','Délégation départementale de l''Oise','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('1651bcc5-846f-4320-9fb7-84cbc6039938','Délégation départementale de l''Aisne','Délégation départementale de l''Aisne','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('61e4569d-34f4-4bc0-9aa8-27f634926165','Délégation départementale de la Somme','Délégation départementale de la Somme','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('57c04b6b-2196-47b5-99cb-d9b269b87c78','Direction de la sécurité sanitaire et de la santé environnementale','Direction de la sécurité sanitaire et de la santé environnementale','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('f0aa67fb-62ff-4c91-8b7f-5d92cf3f3b6f','Direction de la prévention et de la promotion de la santé','Direction de la prévention et de la promotion de la santé','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('ed2c6572-eac6-404e-be9c-bbf5a51e7a49','Direction de l''offre médico-sociale','Direction de l''offre médico-sociale','','','',true,'ARS','991e33cf-0935-4327-b52a-f38a9cb698b5','32A','32','Hauts-de-France',NULL),
    ('4e601c39-a6f2-4544-a96e-4b9e8da9491f','DD 59 Département autonomie','DD 59 Département autonomie','','','',true,'ARS','0e19e1a7-f3cd-4793-932a-e4b1225b72c9','32A','32','Hauts-de-France',NULL),
    ('9aff72ee-4416-4eeb-8d32-f3f57997b7b4','DD 59 Département offre de soins ville-hôpital','DD 59 Département offre de soins ville-hôpital','','','',true,'ARS','0e19e1a7-f3cd-4793-932a-e4b1225b72c9','32A','32','Hauts-de-France',NULL),
    ('48368b99-a440-4fce-88be-7512a2243f10','DD 59 Département des affaires transfrontalières','DD 59 Département des affaires transfrontalières','','','',true,'ARS','0e19e1a7-f3cd-4793-932a-e4b1225b72c9','32A','32','Hauts-de-France',NULL),
    ('a69e3752-bca6-4856-bdc6-56709617401b','DD 62 Département autonomie','DD 62 Département autonomie','','','',true,'ARS','d87c7c1f-6778-4eb6-8d87-7a8b7eb15b81','32A','32','Hauts-de-France',NULL),
    ('e7f2612c-96c9-4c5d-9dee-fec7b7881e13','DD 62 Département offre de soins ville-hôpital','DD 62 Département offre de soins ville-hôpital','','','',true,'ARS','d87c7c1f-6778-4eb6-8d87-7a8b7eb15b81','32A','32','Hauts-de-France',NULL),
    ('afcca2f3-a466-4ab2-97b6-1648f58e7daf','DD 60 Département autonomie','DD 60 Département autonomie','','','',true,'ARS','6201a7b8-4feb-439f-bb70-d20559497798','32A','32','Hauts-de-France',NULL),
    ('bf1b96a2-093c-4332-b3fc-ca599e2c8c11','DD 60 Département offre de soins ville-hôpital','DD 60 Département offre de soins ville-hôpital','','','',true,'ARS','6201a7b8-4feb-439f-bb70-d20559497798','32A','32','Hauts-de-France',NULL),
    ('48c69657-ef93-4f5b-8177-a17b2cb8fac2','DD 02 Département autonomie','DD 02 Département autonomie','','','',true,'ARS','1651bcc5-846f-4320-9fb7-84cbc6039938','32A','32','Hauts-de-France',NULL),
    ('09f77956-fc51-4429-a0e1-57064bb36842','DD 02 Département offre de soins ville-hôpital','DD 02 Département offre de soins ville-hôpital','','','',true,'ARS','1651bcc5-846f-4320-9fb7-84cbc6039938','32A','32','Hauts-de-France',NULL),
    ('46c4f673-f6d2-4eaa-ac2d-55a2a5270e6f','DD 80 Département autonomie','DD 80 Département autonomie','','','',true,'ARS','61e4569d-34f4-4bc0-9aa8-27f634926165','32A','32','Hauts-de-France',NULL),
    ('e9451197-450f-4f0c-8052-2ef9eeb0cc3a','DD 80 Département offre de soins ville-hôpital','DD 80 Département offre de soins ville-hôpital','','','',true,'ARS','61e4569d-34f4-4bc0-9aa8-27f634926165','32A','32','Hauts-de-France',NULL),
    ('ddba3de2-1667-4df9-932e-ca4714b5d968','D3SE Point focal régional','D3SE Point focal régional','','','',true,'ARS','57c04b6b-2196-47b5-99cb-d9b269b87c78','32A','32','Hauts-de-France',NULL),
    ('703059d5-ef93-44db-902e-aef6ca72f22b','D3SE Sous-direction inspection contrôle','D3SE Sous-direction inspection contrôle','','','',true,'ARS','57c04b6b-2196-47b5-99cb-d9b269b87c78','32A','32','Hauts-de-France',NULL),
    ('3608f4ce-6371-4656-ac31-c6e7e0be4087','DOS Cellule produits de santé et biologie','DOS Cellule produits de santé et biologie','','','',true,'ARS','8f5fbdac-0807-41c6-bb96-c834b9a2d803','32A','32','Hauts-de-France',NULL)
ON CONFLICT ("id") DO NOTHING;
