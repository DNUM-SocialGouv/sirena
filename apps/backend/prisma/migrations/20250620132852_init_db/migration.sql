-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "pcData" JSONB NOT NULL,
    "roleId" TEXT NOT NULL,
    "entiteId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entite" (
    "id" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT,
    "entiteEnumId" TEXT,
    "entiteMereId" TEXT,

    CONSTRAINT "Entite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntiteEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "EntiteEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "pcIdToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "RoleEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requete" (
    "id" TEXT NOT NULL,
    "dematSocialId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequeteEntite" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requeteId" TEXT,

    CONSTRAINT "RequeteEntite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequeteStatutEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "RequeteStatutEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequeteState" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requeteEntiteId" TEXT NOT NULL,
    "statutId" TEXT NOT NULL,

    CONSTRAINT "RequeteState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Identite" (
    "id" TEXT NOT NULL,
    "prenom" TEXT,
    "nom" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "commentaire" TEXT,

    CONSTRAINT "Identite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Victime" (
    "id" TEXT NOT NULL,
    "estNonIdentifiee" BOOLEAN,
    "estAnonyme" BOOLEAN,
    "estHandicapee" BOOLEAN,
    "commentaire" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,
    "identiteId" TEXT NOT NULL,
    "adresseId" TEXT,
    "ageId" TEXT,
    "civiliteId" TEXT,

    CONSTRAINT "Victime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AgeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Declarant" (
    "id" TEXT NOT NULL,
    "estIdentifie" BOOLEAN,
    "estVictime" BOOLEAN,
    "estVictimeInformee" BOOLEAN,
    "estAnonyme" BOOLEAN,
    "estHandicapee" BOOLEAN,
    "vitimeInformeeCommentaire" TEXT,
    "veutGarderAnonnymat" BOOLEAN,
    "commentaire" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,
    "identiteId" TEXT NOT NULL,
    "adresseId" TEXT,
    "ageId" TEXT,
    "lienVictimeId" TEXT,
    "civiliteId" TEXT,

    CONSTRAINT "Declarant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CiviliteEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CiviliteEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LienVictimeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "LienVictimeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adresse" (
    "id" TEXT NOT NULL,
    "rue" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,

    CONSTRAINT "Adresse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescriptionFaits" (
    "estMaltraitance" BOOLEAN,
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "commentaire" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaits_pkey" PRIMARY KEY ("requeteEntiteStateId")
);

-- CreateTable
CREATE TABLE "MotifEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "MotifEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsequenceEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ConsequenceEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaltraitanceTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "MaltraitanceTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DescriptionFaitsMotif" (
    "faitsId" TEXT NOT NULL,
    "motifId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaitsMotif_pkey" PRIMARY KEY ("faitsId","motifId")
);

-- CreateTable
CREATE TABLE "DescriptionFaitsConsequence" (
    "faitsId" TEXT NOT NULL,
    "consequenceId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaitsConsequence_pkey" PRIMARY KEY ("faitsId","consequenceId")
);

-- CreateTable
CREATE TABLE "DescriptionFaitsMaltraitanceType" (
    "faitsId" TEXT NOT NULL,
    "maltraitanceTypeId" TEXT NOT NULL,

    CONSTRAINT "DescriptionFaitsMaltraitanceType_pkey" PRIMARY KEY ("faitsId","maltraitanceTypeId")
);

-- CreateTable
CREATE TABLE "LieuIncident" (
    "id" TEXT NOT NULL,
    "nom" TEXT,
    "codePostal" TEXT,
    "societeTransport" TEXT,
    "finess" TEXT,
    "commentaire" TEXT,
    "adresseId" TEXT,
    "lieuTypeId" TEXT,
    "transportTypeId" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,

    CONSTRAINT "LieuIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LieuTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "LieuTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "TransportTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MisEnCause" (
    "id" TEXT NOT NULL,
    "estIdentifie" BOOLEAN,
    "identite" TEXT,
    "rpps" TEXT,
    "commentaire" TEXT,
    "professionTypeId" TEXT,
    "requeteEntiteStateId" TEXT NOT NULL,
    "misEnCauseTypeId" TEXT,
    "professionDomicileTypeId" TEXT,

    CONSTRAINT "MisEnCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MisEnCauseTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "MisEnCauseTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ProfessionTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionDomicileTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ProfessionDomicileTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemarchesEngagees" (
    "requeteEntiteStateId" TEXT NOT NULL,
    "aContacte" BOOLEAN,
    "dateContact" TIMESTAMP(3),
    "aRepondu" BOOLEAN,
    "aContacteAutre" BOOLEAN,
    "autreOrganisation" TEXT,
    "aDeposePlainte" BOOLEAN,
    "plainteDeposeDate" TIMESTAMP(3),
    "plainteDeposeLocation" TEXT,
    "commentaire" TEXT,

    CONSTRAINT "DemarchesEngagees_pkey" PRIMARY KEY ("requeteEntiteStateId")
);

-- CreateTable
CREATE TABLE "InfoComplementaire" (
    "requeteEntiteStateId" TEXT NOT NULL,
    "receptionDate" TIMESTAMP(3),
    "commentaire" TEXT,
    "receptionTypeId" TEXT,

    CONSTRAINT "InfoComplementaire_pkey" PRIMARY KEY ("requeteEntiteStateId")
);

-- CreateTable
CREATE TABLE "ReceptionTypeEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ReceptionTypeEnum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "User_sub_key" ON "User"("sub");

-- CreateIndex
CREATE UNIQUE INDEX "EntiteEnum_label_key" ON "EntiteEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_pcIdToken_key" ON "Session"("pcIdToken");

-- CreateIndex
CREATE UNIQUE INDEX "Requete_dematSocialId_key" ON "Requete"("dematSocialId");

-- CreateIndex
CREATE UNIQUE INDEX "Victime_requeteEntiteStateId_key" ON "Victime"("requeteEntiteStateId");

-- CreateIndex
CREATE UNIQUE INDEX "Victime_identiteId_key" ON "Victime"("identiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Declarant_requeteEntiteStateId_key" ON "Declarant"("requeteEntiteStateId");

-- CreateIndex
CREATE UNIQUE INDEX "Declarant_identiteId_key" ON "Declarant"("identiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Declarant_adresseId_key" ON "Declarant"("adresseId");

-- CreateIndex
CREATE UNIQUE INDEX "CiviliteEnum_label_key" ON "CiviliteEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "LienVictimeEnum_label_key" ON "LienVictimeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "MotifEnum_label_key" ON "MotifEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ConsequenceEnum_label_key" ON "ConsequenceEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "MaltraitanceTypeEnum_label_key" ON "MaltraitanceTypeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "MisEnCauseTypeEnum_label_key" ON "MisEnCauseTypeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionTypeEnum_label_key" ON "ProfessionTypeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionDomicileTypeEnum_label_key" ON "ProfessionDomicileTypeEnum"("label");

-- CreateIndex
CREATE UNIQUE INDEX "ReceptionTypeEnum_label_key" ON "ReceptionTypeEnum"("label");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entite" ADD CONSTRAINT "Entite_entiteEnumId_fkey" FOREIGN KEY ("entiteEnumId") REFERENCES "EntiteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entite" ADD CONSTRAINT "Entite_entiteMereId_fkey" FOREIGN KEY ("entiteMereId") REFERENCES "Entite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteEntite" ADD CONSTRAINT "RequeteEntite_requeteId_fkey" FOREIGN KEY ("requeteId") REFERENCES "Requete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteState" ADD CONSTRAINT "RequeteState_requeteEntiteId_fkey" FOREIGN KEY ("requeteEntiteId") REFERENCES "RequeteEntite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteState" ADD CONSTRAINT "RequeteState_statutId_fkey" FOREIGN KEY ("statutId") REFERENCES "RequeteStatutEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Victime" ADD CONSTRAINT "Victime_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Victime" ADD CONSTRAINT "Victime_identiteId_fkey" FOREIGN KEY ("identiteId") REFERENCES "Identite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Victime" ADD CONSTRAINT "Victime_adresseId_fkey" FOREIGN KEY ("adresseId") REFERENCES "Adresse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Victime" ADD CONSTRAINT "Victime_ageId_fkey" FOREIGN KEY ("ageId") REFERENCES "AgeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Victime" ADD CONSTRAINT "Victime_civiliteId_fkey" FOREIGN KEY ("civiliteId") REFERENCES "CiviliteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declarant" ADD CONSTRAINT "Declarant_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declarant" ADD CONSTRAINT "Declarant_identiteId_fkey" FOREIGN KEY ("identiteId") REFERENCES "Identite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declarant" ADD CONSTRAINT "Declarant_adresseId_fkey" FOREIGN KEY ("adresseId") REFERENCES "Adresse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declarant" ADD CONSTRAINT "Declarant_ageId_fkey" FOREIGN KEY ("ageId") REFERENCES "AgeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declarant" ADD CONSTRAINT "Declarant_lienVictimeId_fkey" FOREIGN KEY ("lienVictimeId") REFERENCES "LienVictimeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Declarant" ADD CONSTRAINT "Declarant_civiliteId_fkey" FOREIGN KEY ("civiliteId") REFERENCES "CiviliteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionFaits" ADD CONSTRAINT "DescriptionFaits_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsMotif" ADD CONSTRAINT "DescriptionFaitsMotif_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "DescriptionFaits"("requeteEntiteStateId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsMotif" ADD CONSTRAINT "DescriptionFaitsMotif_motifId_fkey" FOREIGN KEY ("motifId") REFERENCES "MotifEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsConsequence" ADD CONSTRAINT "DescriptionFaitsConsequence_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "DescriptionFaits"("requeteEntiteStateId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsConsequence" ADD CONSTRAINT "DescriptionFaitsConsequence_consequenceId_fkey" FOREIGN KEY ("consequenceId") REFERENCES "ConsequenceEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "DescriptionFaits"("requeteEntiteStateId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DescriptionFaitsMaltraitanceType" ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_maltraitanceTypeId_fkey" FOREIGN KEY ("maltraitanceTypeId") REFERENCES "MaltraitanceTypeEnum"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieuIncident" ADD CONSTRAINT "LieuIncident_adresseId_fkey" FOREIGN KEY ("adresseId") REFERENCES "Adresse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieuIncident" ADD CONSTRAINT "LieuIncident_lieuTypeId_fkey" FOREIGN KEY ("lieuTypeId") REFERENCES "LieuTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieuIncident" ADD CONSTRAINT "LieuIncident_transportTypeId_fkey" FOREIGN KEY ("transportTypeId") REFERENCES "TransportTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LieuIncident" ADD CONSTRAINT "LieuIncident_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_professionTypeId_fkey" FOREIGN KEY ("professionTypeId") REFERENCES "ProfessionTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCauseTypeId_fkey" FOREIGN KEY ("misEnCauseTypeId") REFERENCES "MisEnCauseTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_professionDomicileTypeId_fkey" FOREIGN KEY ("professionDomicileTypeId") REFERENCES "ProfessionDomicileTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemarchesEngagees" ADD CONSTRAINT "DemarchesEngagees_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoComplementaire" ADD CONSTRAINT "InfoComplementaire_receptionTypeId_fkey" FOREIGN KEY ("receptionTypeId") REFERENCES "ReceptionTypeEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfoComplementaire" ADD CONSTRAINT "InfoComplementaire_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
