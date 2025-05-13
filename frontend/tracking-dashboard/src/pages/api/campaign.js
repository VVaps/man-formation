// pages/api/campaign.js

import nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';

// Create a connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Retrieve fields from the request body
    const { studentEmails, campaignType, schedule, scheduledTime } = req.body;
    
    if (!studentEmails || !studentEmails.length) {
      return res.status(400).json({ message: "Aucun email fourni." });
    }

    // Extract and verify the JWT from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Missing token.' });
    }
    const token = authHeader.split(' ')[1];
    let teacher_id;
    try {
      // Use your secret to verify; note that the token payload should contain "user_id"
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      teacher_id = decoded.user_id;
      if (!teacher_id) {
        return res.status(400).json({ message: 'Teacher ID not found in token.' });
      }
    } catch (error) {
      console.error("JWT verification error:", error);
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // Generate a unique campaign identifier
    const campaignId = randomUUID();

    // Build the URL for the fake phishing page (this URL is used in the email)
    const fakePageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/fake-page?campaignId=${campaignId}&type=${campaignType}`;

    if (schedule === 'immediate') {
      // When scheduled immediately, send out emails right away
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
          },
        });

        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: studentEmails.join(','),
          subject: 'Nouvelle campagne de simulation de phishing',
          text: `Bonjour,

Vous avez reçu un message vous invitant à vérifier vos informations.

Veuillez cliquer sur le lien suivant pour continuer : ${fakePageUrl}

Attention : Ceci est une simulation de phishing à des fins éducatives.`,
        };

        await transporter.sendMail(mailOptions);

        // Optionally, you might record this immediate campaign in a DB table if desired.

        return res.status(200).json({
          message: 'Campagne lancée et email(s) envoyés immédiatement.',
          campaignId
        });
      } catch (error) {
        console.error("Erreur lors de l'envoi de l'email:", error);
        return res.status(500).json({
          message: "Erreur serveur lors de l'envoi de l'email."
        });
      }
    } else if (schedule === 'scheduled') {
      // For scheduled campaigns, ensure scheduledTime is provided
      if (!scheduledTime) {
        return res.status(400).json({
          message: 'Vous devez choisir une date et une heure pour l\'envoi programmé.'
        });
      }

      try {
        // Convert the local datetime string into a JavaScript Date object
        const userLocalDate = new Date(scheduledTime);
        // Convert that date to a UTC datetime string for MySQL
        const mysqlDateTimeUTC = userLocalDate
          .toISOString()         // e.g., "2025-04-08T19:23:00.000Z"
          .slice(0, 19)          // "2025-04-08T19:23:00"
          .replace('T', ' ');    // "2025-04-08 19:23:00"

        // Insert the campaign details into the "scheduled_campaigns" table.
        // Make sure this table exists with columns: campaign_id, teacher_id, student_emails, campaign_type, scheduled_time.
        const insertQuery = `
          INSERT INTO scheduled_campaigns
            (campaign_id, teacher_id, student_emails, campaign_type, scheduled_time)
          VALUES (?, ?, ?, ?, ?)
        `;
        const values = [
          campaignId,
          teacher_id, // now using the authenticated teacher's ID
          studentEmails.join(','),
          campaignType,
          mysqlDateTimeUTC
        ];

        await pool.query(insertQuery, values);

        return res.status(200).json({
          message: `Campagne planifiée pour l'envoi le ${scheduledTime}.`,
          campaignId
        });
      } catch (error) {
        console.error("Erreur lors de l'insertion dans scheduled_campaigns:", error);
        return res.status(500).json({
          message: 'Erreur serveur lors de la planification de la campagne.'
        });
      }
    } else {
      return res.status(400).json({ message: 'Option d\'envoi invalide.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée.` });
  }
}
