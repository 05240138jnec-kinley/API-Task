// src/db.js - MySQL connection pool for Aiven
const mysql2 = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME || 'defaultdb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Aiven requires an encrypted (SSL) connection.
if ((process.env.DB_SSL || '').toUpperCase() === 'REQUIRED') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

module.exports = mysql2.createPool(poolConfig);