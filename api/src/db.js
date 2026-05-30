const sql = require('mssql');

const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: { encrypt: true, trustServerCertificate: false },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool = null;

async function getPool() {
  if (!pool) pool = await sql.connect(config);
  return pool;
}

module.exports = { getPool, sql };
