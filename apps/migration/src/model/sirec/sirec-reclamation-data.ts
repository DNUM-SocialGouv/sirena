import { mysqlPool } from "../../config/mysql.js";

export type SirecReclamationData = {
  id: number;
  description: string;
};

export const getSirecReclamationDataById = async (
  id: number,
): Promise<SirecReclamationData | null> => {
  const query = "SELECT * FROM sire_reclamation_data WHERE id_data = ?";
  const [rows]: any = await mysqlPool.execute(query, [id]);
  return rows[0];
};
