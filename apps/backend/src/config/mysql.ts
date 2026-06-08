import mysql from 'mysql2/promise';
import { envVars } from './env.js';

const { MARIADB_SIREC_HOST, MARIADB_SIREC_PORT, MARIADB_SIREC_DB, MARIADB_SIREC_USER, MARIADB_SIREC_PASSWORD } =
  envVars;

export const mysqlPool = mysql.createPool({
  host: MARIADB_SIREC_HOST,
  port: MARIADB_SIREC_PORT,
  database: MARIADB_SIREC_DB,
  user: MARIADB_SIREC_USER,
  password: MARIADB_SIREC_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
