import mysql from 'mysql2/promise';
import { envVars } from './env.js';

const { MYSQL_SIREC_HOST, MYSQL_SIREC_PORT, MYSQL_SIREC_DB, MYSQL_SIREC_USER, MYSQL_SIREC_PASSWORD } = envVars;

export const mysqlPool = mysql.createPool({
  host: MYSQL_SIREC_HOST,
  port: MYSQL_SIREC_PORT,
  database: MYSQL_SIREC_DB,
  user: MYSQL_SIREC_USER,
  password: MYSQL_SIREC_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
