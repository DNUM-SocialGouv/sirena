export interface SirenaEtapeData {
  nom: string;
  entiteId: string;
  statutId: string;
  createdAt?: Date;
  note: string | null;
  clotureReason?: string;
  clotureEffectiveDate?: Date;
  dateRealisation?: Date;
  sirecFileTypeKeys?: string[];
  /** id_data de la main courante SIREC à l'origine de cette étape (cf. transformSirecMainCourantes). */
  sirecMainCouranteId?: number;
}
