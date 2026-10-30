// server-mvc.js - entry point
require('dotenv').config();            // must be first
const express = require('express');
const path = require('path');
const taskRoutes = require('./src/routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Allow the frontend to call the API from another port (e.g. Live Server 5500)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve the frontend (public/index.html, style.css, app.js)
app.use(express.static(path.join(__dirname, 'public')));

// API health check
app.get('/api', (req, res) => {
  res.json({ message: 'Task API is ready!', database: 'Aiven MySQL' });
});

// TEMPORARY: shows exactly why the database connection fails. Delete later.
app.get('/api/check', async (req, res) => {
  const pool = require('./src/db');
  const env = {
    DB_HOST: process.env.DB_HOST || 'MISSING',
    DB_PORT: process.env.DB_PORT || 'MISSING',
    DB_USER: process.env.DB_USER || 'MISSING',
    DB_PASS: process.env.DB_PASS ? 'set' : 'MISSING',
    DB_NAME: process.env.DB_NAME || 'MISSING',
    DB_SSL: process.env.DB_SSL || 'MISSING',
  };
  try {
    const [rows] = await pool.query('SELECT DATABASE() AS db');
    const [tables] = await pool.query('SHOW TABLES');
    res.json({ connected: true, database: rows[0].db, tables, env });
  } catch (err) {
    res.json({ connected: false, code: err.code, message: err.message, env });
  }
});

// API routes: GET/POST /tasks, GET/PUT/PATCH/DELETE /tasks/:id
app.use('/tasks', taskRoutes);

// Unknown path -> JSON 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler (4 parameters)
app.use((err, req, res, next) => {
  console.error('-----------------------------');
  console.error('ERROR CODE   :', err.code);
  console.error('ERROR MESSAGE:', err.message);
  console.error('-----------------------------');
  res.status(err.statusCode || 500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});