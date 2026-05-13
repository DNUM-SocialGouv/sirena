export class SirecTranscoError extends Error {
  constructor(
    public readonly idDico: number,
    public readonly tableName: string,
  ) {
    super(`No SIRENA mapping found for SIREC id_dico ${idDico} in ${tableName} transco table`);
    this.name = 'SirecTranscoError';
  }
}
