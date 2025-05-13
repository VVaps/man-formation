// pages/api/register.js
import bcrypt from 'bcryptjs';

// For demonstration, we use an in-memory array.
// In production, use a database.
let users = [];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if user already exists
  const existingUser = users.find((user) => user.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }

  try {
    // Hash the password (using bcrypt)
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now(),
      username,
      email,
      password: hashedPassword
    };

    users.push(newUser);
    console.log('Registered Users:', users);
    return res.status(200).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
}
