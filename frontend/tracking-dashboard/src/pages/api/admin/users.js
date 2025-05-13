import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.is_admin) return res.status(403).json({ error: 'Forbidden' });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    const [users] = await connection.execute(
      'SELECT id, username, email, phone, is_admin, can_start_crawl, can_start_campaign FROM users'
    );

    await connection.end();
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}
