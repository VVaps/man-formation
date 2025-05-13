// pages/api/events.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  // Create a MySQL connection using environment variables.
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  
  try {
    // Query the campaigns table (your collected data)
    const [campaignRows] = await connection.execute(
      'SELECT * FROM campaigns ORDER BY created_at DESC'
    );
    // Query the user_events table (e.g., events not related to campaigns)
    const [userEventRows] = await connection.execute(
      'SELECT * FROM user_events ORDER BY timestamp DESC'
    );
    // Return both result sets as properties in the JSON response
    res.status(200).json({
      campaigns: campaignRows,
      user_events: userEventRows,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  } finally {
    await connection.end();
  }
}
