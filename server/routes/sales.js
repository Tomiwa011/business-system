import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

const PAYMENT_METHODS = ['cash', 'transfer', 'card'];
const MAX_ITEMS_PER_SALE = 50;

// Lets us throw a clean error with a status code from inside the transaction
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// POST /api/sales
router.post('/', async (req, res) => {
  const { items, payment_method = 'cash' } = req.body;

  // ---- Validate input before touching the database ----
  if (!PAYMENT_METHODS.includes(payment_method)) {
    return res.status(400).json({ message: 'Payment method must be cash, transfer or card' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'A sale needs at least one item' });
  }
  if (items.length > MAX_ITEMS_PER_SALE) {
    return res.status(400).json({ message: `A sale can have at most ${MAX_ITEMS_PER_SALE} items` });
  }

  // Merge duplicate product ids (same product listed twice becomes one line)
  const wanted = new Map();
  for (const item of items) {
    const productId = parseId(item?.product_id);
    const quantity = Number(item?.quantity);
    if (!productId) {
      return res.status(400).json({ message: 'Each item needs a valid product_id' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Each quantity must be a whole number above 0' });
    }
    wanted.set(productId, (wanted.get(productId) || 0) + quantity);
  }

  const productIds = [...wanted.keys()].sort((a, b) => a - b);

  // ---- The transaction ----
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock all the products involved, in id order (avoids deadlocks)
    const productResult = await client.query(
      `SELECT id, name, price, stock_quantity, is_active
       FROM products
       WHERE id = ANY($1)
       ORDER BY id
       FOR UPDATE`,
      [productIds]
    );

    const productsById = new Map(productResult.rows.map((p) => [p.id, p]));

    // Check every item and work out the total (in kobo to avoid decimal errors)
    let totalKobo = 0;
    const lines = [];

    for (const productId of productIds) {
      const product = productsById.get(productId);
      const quantity = wanted.get(productId);

      if (!product) {
        throw new HttpError(404, `Product ${productId} does not exist`);
      }
      if (!product.is_active) {
        throw new HttpError(400, `${product.name} is no longer available`);
      }
      if (product.stock_quantity < quantity) {
        throw new HttpError(
          409,
          `Not enough stock for ${product.name} (requested ${quantity}, available ${product.stock_quantity})`
        );
      }

      totalKobo += Math.round(Number(product.price) * 100) * quantity;
      lines.push({
        product_id: product.id,
        name: product.name,
        quantity,
        unit_price: product.price,
      });
    }

    const total = (totalKobo / 100).toFixed(2);

    // Create the sale
    const saleResult = await client.query(
      `INSERT INTO sales (user_id, total_amount, payment_method)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, total, payment_method]
    );
    const sale = saleResult.rows[0];

    // Add the items and take the stock down
    for (const line of lines) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [sale.id, line.product_id, line.quantity, line.unit_price]
      );
      await client.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [line.quantity, line.product_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ sale: { ...sale, items: lines } });
  } catch (err) {
    await client.query('ROLLBACK');

    if (err instanceof HttpError) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Something went wrong, the sale was not recorded' });
  } finally {
    client.release();
  }
});

// GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=20&offset=0
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    if (from && !isDateString(from)) {
      return res.status(400).json({ message: 'from must be a date like 2026-11-01' });
    }
    if (to && !isDateString(to)) {
      return res.status(400).json({ message: 'to must be a date like 2026-11-30' });
    }

    const conditions = [];
    const params = [];

    // Staff only see their own sales
    if (req.user.role !== 'admin') {
      params.push(req.user.id);
      conditions.push(`s.user_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`s.created_at >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`s.created_at < ($${params.length}::date + 1)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM sales s ${where}`,
      params
    );

    const listParams = [...params, limit, offset];
    const result = await pool.query(
      `SELECT s.id, s.total_amount, s.payment_method, s.created_at,
              u.name AS cashier_name,
              (SELECT COALESCE(SUM(quantity), 0)::int
               FROM sale_items WHERE sale_id = s.id) AS item_count
       FROM sales s
       JOIN users u ON u.id = s.user_id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    res.json({ sales: result.rows, total: countResult.rows[0].total, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// GET /api/sales/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid sale id' });

    const saleResult = await pool.query(
      `SELECT s.id, s.user_id, s.total_amount, s.payment_method, s.created_at,
              u.name AS cashier_name
       FROM sales s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1`,
      [id]
    );
    const sale = saleResult.rows[0];

    // Staff asking for someone else's sale get 404, same as if it didn't exist
    if (!sale || (req.user.role !== 'admin' && sale.user_id !== req.user.id)) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const itemsResult = await pool.query(
      `SELECT si.product_id, p.name, si.quantity, si.unit_price
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = $1
       ORDER BY si.id`,
      [id]
    );

    res.json({ sale: { ...sale, items: itemsResult.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default router;