import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.log('Usage: node scripts/createAdmin.js "Full Name" email@example.com password');
  process.exit(1);
}

if (password.length < 8) {
  console.log('Password must be at least 8 characters.');
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     RETURNING id, name, email, role`,
    [name.trim(), email.trim().toLowerCase(), passwordHash]
  );
  console.log('Admin created:', result.rows[0]);
} catch (err) {
  if (err.code === '23505') {
    console.log('A user with that email already exists.');
  } else {
    console.error(err);
  }
} finally {
  await pool.end();
}