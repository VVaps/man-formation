// pages/api/events/[id].js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    let { id, user_id } = req.query;
    if (!id || !user_id) {
      return res.status(400).json({ error: 'Missing id or user_id' });
    }

    id = Number(id);
    user_id = Number(user_id);

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    // First, try to fetch from campaigns table.
    let [rows] = await connection.execute(
      'SELECT * FROM campaigns WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    // If not found, fallback to user_events table.
    if (rows.length === 0) {
      [rows] = await connection.execute(
        'SELECT * FROM user_events WHERE id = ? AND user_id = ?',
        [id, user_id]
      );
    }

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
