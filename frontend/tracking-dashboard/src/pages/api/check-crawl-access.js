import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id; // use user_id now
    if (!userId) return res.status(400).json({ error: 'User ID not found in token payload' });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    const [rows] = await connection.execute(
      'SELECT can_start_crawl FROM users WHERE id = ?',
      [userId]
    );
    await connection.end();
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ can_start_crawl: Number(rows[0].can_start_crawl) === 1 });
  } catch (error) {
    console.error('Error verifying crawl access:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
