import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, phone, password, confirmPassword } = req.body;

  try {
    if (!validator.isLength(username, { min: 3, max: 30 })) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }

    if (!validator.isMobilePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (!validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })) {
      return res.status(400).json({ 
        error: 'Password must contain at least 8 characters with 1 uppercase, 1 number, and 1 symbol'
      });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input format' });
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      port: process.env.DB_PORT,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      `SELECT email, username, phone FROM users 
       WHERE email = ? OR username = ? OR phone = ? 
       LIMIT 1`,
      [email, username, phone]
    );

    if (existingUsers.length > 0) {
      const conflicts = [];
      if (existingUsers[0].email === email) conflicts.push('email');
      if (existingUsers[0].username === username) conflicts.push('username');
      if (existingUsers[0].phone === phone) conflicts.push('phone');
      
      await connection.rollback();
      return res.status(409).json({ 
        error: 'Conflict', 
        message: 'User already exists', 
        conflicts 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await connection.execute(
      `INSERT INTO users 
       (username, email, phone, password, is_verified, verification_token, verification_token_expires)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [username, email, phone, hashedPassword, verificationToken, verificationExpires]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_SENDER_NAME}" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Our Platform!</h2>
          <p>Please verify your email address to complete your registration:</p>
          <a href="${verificationUrl}" 
             style="display: inline-block; padding: 12px 24px; 
                    background-color: #2563eb; color: white; 
                    text-decoration: none; border-radius: 4px;">
            Verify Email
          </a>
          <p style="margin-top: 20px; color: #666;">
            This link will expire in 24 hours. If you didn't request this, 
            please ignore this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (connection) await connection.rollback();
    
    return res.status(500).json({ 
      error: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  } finally {
    if (connection) await connection.end();
  }
}
