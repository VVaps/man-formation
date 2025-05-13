// pages/api/verify-email.js
import mysql from 'mysql2/promise';

// Helper to verify token and update user
async function verifyEmailToken(token) {
  if (!token) {
    throw Object.assign(new Error('Token manquant'), { status: 400 });
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    // Check token validity within 24h
    const [users] = await connection.execute(
      `SELECT id FROM users
       WHERE verification_token = ?
         AND verification_token_expires >= NOW()`,
      [token]
    );

    if (users.length === 0) {
      throw Object.assign(new Error('Lien invalide ou expiré'), { status: 400 });
    }

    // Mark as verified and clear token
    await connection.execute(
      `UPDATE users
       SET is_verified = 1,
           verification_token = NULL,
           verification_token_expires = NULL
       WHERE id = ?`,
      [users[0].id]
    );

    return {
      verified: true,
      message: 'Vérification réussie'
    };
  } finally {
    await connection.end();
  }
}

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.query;
  try {
    const result = await verifyEmailToken(token);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
}
