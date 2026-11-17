import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Every route in this file is admin-only
router.use(requireAuth, requireRole('admin'));

const ROLES = ['admin', 'staff'];

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const PUBLIC_FIELDS = 'id, name, email, role, is_active, created_at';

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
              (SELECT COUNT(*)::int FROM sales s WHERE s.user_id = u.id) AS sales_count
       FROM users u
       ORDER BY u.created_at ASC, u.id ASC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// POST /api/users  (create a staff or admin account)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'staff' } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or staff' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'That email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING ${PUBLIC_FIELDS}`,
      [String(name).trim(), cleanEmail, passwordHash, role]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// PATCH /api/users/:id/status  (activate or deactivate)
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid user id' });

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active must be true or false' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own active status' });
    }

    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`,
      [is_active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// PATCH /api/users/:id/role
router.patch('/:id/role', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid user id' });

    const { role } = req.body;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or staff' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`,
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// PATCH /api/users/:id/password  (admin resets someone's password)
router.patch('/:id/password', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid user id' });

    const { password } = req.body;
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Bumping token_version logs that user out everywhere
    const result = await pool.query(
      `UPDATE users
       SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2
       RETURNING id`,
      [passwordHash, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If an admin reset their own password here, this browser's session ends too
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default router;