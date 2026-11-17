import express from 'express';
import pool from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Every product route needs a logged-in user
router.use(requireAuth);

// Staff must not see cost_price
function present(product, role) {
  if (role === 'admin') return product;
  const { cost_price, ...rest } = product;
  return rest;
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isNonNegativeNumber(value) {
  return value !== '' && value !== null && !Number.isNaN(Number(value)) && Number(value) >= 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(Number(value)) && value !== '' && value !== null && Number(value) >= 0;
}

// Returns an error message string, or null if everything is fine
function validateProduct(body, { requireStock }) {
  const { name, sku, price, cost_price, stock_quantity, low_stock_threshold } = body;

  if (!name || !String(name).trim()) return 'Name is required';
  if (!sku || !String(sku).trim()) return 'SKU is required';
  if (!isNonNegativeNumber(price)) return 'Price must be a number, 0 or more';
  if (cost_price !== undefined && !isNonNegativeNumber(cost_price)) {
    return 'Cost price must be a number, 0 or more';
  }
  if (low_stock_threshold !== undefined && !isNonNegativeInteger(low_stock_threshold)) {
    return 'Low stock threshold must be a whole number, 0 or more';
  }
  if (requireStock && stock_quantity !== undefined && !isNonNegativeInteger(stock_quantity)) {
    return 'Stock quantity must be a whole number, 0 or more';
  }
  return null;
}

// GET /api/products?search=&category=&status=active|inactive|all&low_stock=true
router.get('/', async (req, res) => {
  try {
    const { search, category, status = 'active', low_stock } = req.query;

    const conditions = [];
    const params = [];

    if (status === 'active') conditions.push('is_active = TRUE');
    else if (status === 'inactive') conditions.push('is_active = FALSE');

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      conditions.push(`(name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
    }

    if (category && category.trim()) {
      params.push(category.trim());
      conditions.push(`category = $${params.length}`);
    }

    if (low_stock === 'true') {
      conditions.push('stock_quantity <= low_stock_threshold');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT *, (stock_quantity <= low_stock_threshold) AS is_low_stock
       FROM products
       ${where}
       ORDER BY name ASC`,
      params
    );

    res.json({ products: result.rows.map((p) => present(p, req.user.role)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid product id' });

    const result = await pool.query(
      `SELECT *, (stock_quantity <= low_stock_threshold) AS is_low_stock
       FROM products WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product: present(result.rows[0], req.user.role) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// POST /api/products  (admin)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const error = validateProduct(req.body, { requireStock: true });
    if (error) return res.status(400).json({ message: error });

    const {
      name,
      sku,
      category,
      price,
      cost_price = 0,
      stock_quantity = 0,
      low_stock_threshold = 5,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO products
         (name, sku, category, price, cost_price, stock_quantity, low_stock_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        String(name).trim(),
        String(sku).trim().toUpperCase(),
        category ? String(category).trim() : null,
        price,
        cost_price,
        stock_quantity,
        low_stock_threshold,
      ]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A product with that SKU already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// PUT /api/products/:id  (admin) - edits details, NOT stock
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid product id' });

    const error = validateProduct(req.body, { requireStock: false });
    if (error) return res.status(400).json({ message: error });

    const { name, sku, category, price, cost_price = 0, low_stock_threshold = 5 } = req.body;

    const result = await pool.query(
      `UPDATE products
       SET name = $1, sku = $2, category = $3, price = $4,
           cost_price = $5, low_stock_threshold = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        String(name).trim(),
        String(sku).trim().toUpperCase(),
        category ? String(category).trim() : null,
        price,
        cost_price,
        low_stock_threshold,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'A product with that SKU already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// PATCH /api/products/:id/restock  (admin) - adds stock
router.patch('/:id/restock', requireRole('admin'), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid product id' });

    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be a whole number above 0' });
    }

    // Done in one SQL statement so two restocks at once can't overwrite each other
    const result = await pool.query(
      `UPDATE products
       SET stock_quantity = stock_quantity + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [quantity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// PATCH /api/products/:id/status  (admin) - activate or deactivate
router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid product id' });

    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ message: 'is_active must be true or false' });
    }

    const result = await pool.query(
      `UPDATE products SET is_active = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default router;