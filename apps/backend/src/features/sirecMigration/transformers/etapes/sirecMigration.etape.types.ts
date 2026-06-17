export interface SirenaEtapeData {
  nom: string;
  entiteId: string;
  statutId: string;
  createdAt?: Date;
  note: string | null;
  clotureReason?: string;
}
