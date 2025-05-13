// pages/api/log-action.js

import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { action, details } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action type is required' });
    }

    try {
      // Create a MySQL connection using environment variables
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        port: process.env.DB_PORT,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      });

      // Insert the log record. The table "action_logs" must exist with columns:
      // id (auto-increment), action (VARCHAR), details (TEXT), createdAt (DATETIME)
      const query =
        "INSERT INTO action_logs (action, details, createdAt) VALUES (?, ?, ?)";
      const values = [action, JSON.stringify(details), new Date()];
      await connection.execute(query, values);

      // Close the connection after executing the query
      await connection.end();
      return res.status(200).json({ message: 'Logged action successfully' });
    } catch (error) {
      console.error('Error logging action:', error);
      return res.status(500).json({ error: 'Failed to log action' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}