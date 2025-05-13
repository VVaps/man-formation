import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET); // admin authentication
    const { userId, can_start_crawl } = req.body;
    if (userId === undefined || can_start_crawl === undefined) {
      return res.status(400).json({ error: 'Missing userId or can_start_crawl in payload' });
    }

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    await connection.execute(
      'UPDATE users SET can_start_crawl = ? WHERE id = ?',
      [can_start_crawl ? 1 : 0, userId]
    );
    await connection.end();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error toggling crawl access:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
