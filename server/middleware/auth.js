import jwt from 'jsonwebtoken';
import pool from '../db.js';

// Blocks anyone who isn't logged in
export async function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Not logged in' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }

  try {
    // Check the database every time so deactivated users and
    // changed passwords take effect immediately
    const result = await pool.query(
      'SELECT id, name, email, role, is_active, token_version FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = result.rows[0];

    if (!user || !user.is_active || user.token_version !== decoded.tv) {
      return res.status(401).json({ message: 'Session ended. Please log in again.' });
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
}

// Blocks anyone whose role isn't in the allowed list
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that' });
    }
    next();
  };
}