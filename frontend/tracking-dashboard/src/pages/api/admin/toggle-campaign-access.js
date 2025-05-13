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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.is_admin) return res.status(403).json({ error: 'Forbidden' });
    
    // Get target user's id and new access flag from the body.
    const { userId, can_start_campaign } = req.body;
    if (userId === undefined || can_start_campaign === undefined) {
      return res.status(400).json({ error: 'Missing userId or can_start_campaign in payload' });
    }
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    await connection.execute(
      'UPDATE users SET can_start_campaign = ? WHERE id = ?',
      [can_start_campaign ? 1 : 0, userId]
    );
    await connection.end();
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error toggling campaign access:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
