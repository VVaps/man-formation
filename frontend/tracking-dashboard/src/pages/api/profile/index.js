// pages/api/profile/index.js
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }
  
  let userId;
  try {
    // Verify token using your secret and extract user_id
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.user_id;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    
    const [rows] = await connection.execute(
      'SELECT username, email, phone FROM users WHERE id = ?',
      [userId]
    );
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.status(200).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
