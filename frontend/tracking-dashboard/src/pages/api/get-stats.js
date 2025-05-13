// pages/api/get-stats.js
import mysql from 'mysql2/promise';

export default async function handler(req, res) {
  try {
    // Create a MySQL connection using environment variables
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    // Query the logs for campaigns and crawls (assuming you log actions to action_logs)
    const [campaignLogRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM action_logs WHERE action = ?",
      ['campaign']
    );
    const [crawlLogRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM action_logs WHERE action = ?",
      ['crawl']
    );

    // Query the collected data from campaigns table
    const [campaignsRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM campaigns"
    );

    // Query the user_events table counting rows having additional_data with non-null email and pass.
    // This assumes that additional_data is stored as JSON.
    const [userEventsRows] = await connection.execute(
      "SELECT COUNT(*) AS count FROM user_events WHERE additional_data IS NOT NULL AND JSON_EXTRACT(additional_data, '$.email') IS NOT NULL AND JSON_EXTRACT(additional_data, '$.pass') IS NOT NULL"
    );

    // Close the connection
    await connection.end();

    // Sum the counts of campaigns and user_events to define "Données collectées"
    const collectedDataCount =
      Number(campaignsRows[0].count) + Number(userEventsRows[0].count);

    // Prepare your stats data array
    const stats = [
      { label: 'Campagnes lancées', value: campaignLogRows[0].count, icon: '🚀' },
      { label: 'Crawls initiés', value: crawlLogRows[0].count, icon: '🌐' },
      { label: 'Données collectées', value: collectedDataCount, icon: '📊' },
    ];

    return res.status(200).json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
