-- CreateTable
CREATE TABLE "RequeteProvenanceEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "RequeteProvenanceEnum_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RequeteProvenanceEnum_label_key" ON "RequeteProvenanceEnum"("label");

-- AddColumn
ALTER TABLE "Requete" ADD COLUMN "provenanceId" TEXT;
ALTER TABLE "Requete" ADD COLUMN "provenancePrecision" TEXT;

-- AddForeignKey
ALTER TABLE "Requete" ADD CONSTRAINT "Requete_provenanceId_fkey" FOREIGN KEY ("provenanceId") REFERENCES "RequeteProvenanceEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed enum values
INSERT INTO "RequeteProvenanceEnum" ("id", "label") VALUES
('AUTO_SAISINE_PARTICULIER', 'Auto-saisine du service suite à la sollicitation d''un particulier'),
('AUTO_SAISINE_PRO', 'Auto-saisine du service suite à la sollicitation d''un professionnel interne ou externe'),
('PRESIDENCE_REPUBLIQUE', 'Présidence de la République'),
('ELUS', 'Élus'),
('PREFECTURE', 'Préfecture'),
('ARS', 'ARS'),
('CONSEIL_DEPARTEMENTAL', 'Conseil départemental'),
('DDETS_DREETS', 'DDETS, DREETS'),
('PREMIER_MINISTRE', 'Premier Ministre'),
('MINISTERES', 'Ministères'),
('PRESIDENCE_AN_SENAT', 'Présidence de l''Assemblée Nationale ou du Sénat'),
('IGAS', 'Inspection Générale des Affaires Sociales'),
('PARQUET', 'Parquet'),
('DEFENSEUR_DROITS', 'Défenseur des droits'),
('CONSEILS_ORDRE', 'Conseils de l''Ordre'),
('ASSOCIATIONS_USAGERS', 'Associations / Représentants / Collectifs d''usagers'),
('ASSURANCE_MALADIE', 'Assurance Maladie'),
('DEMANDE_SDIS', 'Demande du SDIS'),
('AUTRE', 'Autre');
