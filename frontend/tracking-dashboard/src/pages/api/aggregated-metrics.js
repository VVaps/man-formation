// pages/api/aggregated-metrics.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    const { user_id } = req.query;
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    // Create a connection to the database.
    const connection = await mysql.createConnection({
         host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    // Aggregate total clicks from the campaigns table by extracting totalClicks from JSON.
    const [clicksResults] = await connection.execute(
      'SELECT SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(additional_data, "$.totalClicks")) AS UNSIGNED)) AS totalClicks FROM campaigns WHERE user_id = ?',
      [user_id]
    );

    // Aggregate total inputs from the campaigns table by extracting totalInputs from JSON.
    const [inputsResults] = await connection.execute(
      'SELECT SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(additional_data, "$.totalInputs")) AS UNSIGNED)) AS totalInputs FROM campaigns WHERE user_id = ?',
      [user_id]
    );

    await connection.end();

    res.status(200).json({
      totalClicks: clicksResults[0].totalClicks || 0,
      totalInputs: inputsResults[0].totalInputs || 0
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
  
}
