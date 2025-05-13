// pages/api/profile/update.js
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.user_id; // Use new property from token payload.
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const { username, email, phone, password } = req.body;
  
  if (!username || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
    
    let query, params;
    if (password) {
      // If a new password is provided, hash it
      const hashedPassword = await bcrypt.hash(password, 10);
      query = 'UPDATE users SET username = ?, email = ?, phone = ?, password = ? WHERE id = ?';
      params = [username, email, phone, hashedPassword, userId];
    } else {
      query = 'UPDATE users SET username = ?, email = ?, phone = ? WHERE id = ?';
      params = [username, email, phone, userId];
    }
    
    await connection.execute(query, params);
    await connection.end();
    
    return res.status(200).json({ success: true, message: 'Profile updated successfully.' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
