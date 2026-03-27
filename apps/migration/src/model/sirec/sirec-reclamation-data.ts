import { mysqlPool } from "../../config/mysql.js";
import type {SirecReclamation} from "../type.js";

export const getSirecReclamationDataById = async (
  id: number,
): Promise<SirecReclamation | null> => {
  const query = "SELECT * FROM sire_reclamation_data WHERE id_data = ?";
  const [rows]: any = await mysqlPool.execute(query, [id]);
  return rows[0];
};
