// scheduler.js
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') }); 
// If your env is in .env, use '.env' instead of '.env.local'

import cron from 'node-cron';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Configure Nodemailer to use Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  logger: true,  // logs info to the console
  debug: true,   // enables SMTP traffic output
});

// Runs every minute
cron.schedule('* * * * *', async () => {
  try {
    // CHANGED: Use UTC_TIMESTAMP() to compare if scheduled_time <= UTC now
    const [rows] = await pool.query(`
      SELECT * FROM scheduled_campaigns
      WHERE scheduled_time <= UTC_TIMESTAMP() 
        AND sent IS NULL
    `);

    console.log(`[Scheduler] Found ${rows.length} campaign(s) to send`);

    for (const campaign of rows) {
      // Build the fake phishing URL
      const fakePageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/fake-page?campaignId=${campaign.campaign_id}&type=${campaign.campaign_type}`;

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: campaign.student_emails,
        subject: 'Nouvelle campagne de simulation de phishing',
        text: `Bonjour,

Vous avez reçu un message vous invitant à vérifier vos informations.

Veuillez cliquer sur le lien suivant pour continuer : ${fakePageUrl}

Attention : Ceci est une simulation de phishing à des fins éducatives.`,
      };

      console.log(`[Scheduler] Attempting to send email for campaign: ${campaign.campaign_id}`);

      // Send the email
      await transporter.sendMail(mailOptions);
      console.log(`[Scheduler] Email sent for campaign: ${campaign.campaign_id}`);

      // Mark the campaign as "sent" by updating the "sent" column with the current time
      // If your DB is in UTC, NOW() is probably fine. Or you can also do "sent = UTC_TIMESTAMP()"
      await pool.query(
        'UPDATE scheduled_campaigns SET sent = NOW() WHERE id = ?',
        [campaign.id]
      );
      console.log(`[Scheduler] Campaign marked as sent: ${campaign.campaign_id}`);
    }
  } catch (error) {
    console.error('Erreur dans la tâche planifiée:', error);
  }
});

console.log('Scheduler started, checking for scheduled campaigns every minute.');
