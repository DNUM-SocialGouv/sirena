import mysql from 'mysql2/promise';

export const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_SIREC_USER || 'root',
  password: process.env.MYSQL_SIREC_PASSWORD || process.env.MYSQL_SIREC_ROOT_PASSWORD || '',
  database: process.env.MYSQL_SIREC_DB || 'sirec',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
