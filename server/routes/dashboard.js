import express from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

const TZ = process.env.BUSINESS_TIMEZONE || 'Africa/Lagos';

// GET /api/dashboard
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    // Admins see everything (null = no filter), staff see only their own sales
    const userId = isAdmin ? null : req.user.id;

    const summaryQuery = pool.query(
      `WITH t AS (SELECT (NOW() AT TIME ZONE $1)::date AS today),
       s AS (
         SELECT total_amount, (created_at AT TIME ZONE $1)::date AS d
         FROM sales
         WHERE ($2::int IS NULL OR user_id = $2)
       )
       SELECT
         COUNT(*) FILTER (WHERE s.d = t.today)::int AS today_count,
         COALESCE(SUM(s.total_amount) FILTER (WHERE s.d = t.today), 0) AS today_revenue,
         COUNT(*) FILTER (WHERE s.d >= date_trunc('month', t.today)::date)::int AS month_count,
         COALESCE(SUM(s.total_amount) FILTER (WHERE s.d >= date_trunc('month', t.today)::date), 0) AS month_revenue
       FROM s, t`,
      [TZ, userId]
    );

    const dailyQuery = pool.query(
      `WITH t AS (SELECT (NOW() AT TIME ZONE $1)::date AS today),
       days AS (SELECT (t.today - n) AS d FROM t, generate_series(0, 6) AS n)
       SELECT to_char(days.d, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(s.total_amount), 0) AS revenue,
              COUNT(s.id)::int AS sales_count
       FROM days
       LEFT JOIN sales s
         ON (s.created_at AT TIME ZONE $1)::date = days.d
        AND ($2::int IS NULL OR s.user_id = $2)
       GROUP BY days.d
       ORDER BY days.d`,
      [TZ, userId]
    );

    const topProductsQuery = pool.query(
      `SELECT p.id, p.name,
              SUM(si.quantity)::int AS units_sold,
              SUM(si.quantity * si.unit_price) AS revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       WHERE s.created_at >= NOW() - INTERVAL '30 days'
         AND ($1::int IS NULL OR s.user_id = $1)
       GROUP BY p.id, p.name
       ORDER BY units_sold DESC, p.name ASC
       LIMIT 5`,
      [userId]
    );

    const lowStockQuery = pool.query(
      `SELECT id, name, sku, stock_quantity, low_stock_threshold
       FROM products
       WHERE is_active = TRUE AND stock_quantity <= low_stock_threshold
       ORDER BY stock_quantity ASC, name ASC
       LIMIT 20`
    );

    const paymentQuery = pool.query(
      `WITH t AS (SELECT (NOW() AT TIME ZONE $1)::date AS today)
       SELECT s.payment_method,
              COUNT(*)::int AS sales_count,
              COALESCE(SUM(s.total_amount), 0) AS revenue
       FROM sales s, t
       WHERE (s.created_at AT TIME ZONE $1)::date >= date_trunc('month', t.today)::date
         AND ($2::int IS NULL OR s.user_id = $2)
       GROUP BY s.payment_method
       ORDER BY revenue DESC`,
      [TZ, userId]
    );

    // Profit is admin-only
    const profitQuery = isAdmin
      ? pool.query(
          `WITH t AS (SELECT (NOW() AT TIME ZONE $1)::date AS today)
           SELECT COALESCE(SUM(si.quantity * (si.unit_price - p.cost_price)), 0) AS estimated_profit
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           JOIN products p ON p.id = si.product_id, t
           WHERE (s.created_at AT TIME ZONE $1)::date >= date_trunc('month', t.today)::date`,
          [TZ]
        )
      : Promise.resolve(null);

    const [summary, daily, topProducts, lowStock, payments, profit] = await Promise.all([
      summaryQuery,
      dailyQuery,
      topProductsQuery,
      lowStockQuery,
      paymentQuery,
      profitQuery,
    ]);

    const response = {
      summary: summary.rows[0],
      last_7_days: daily.rows,
      top_products: topProducts.rows,
      low_stock: lowStock.rows,
      payment_methods: payments.rows,
    };

    if (isAdmin) {
      response.estimated_profit_this_month = profit.rows[0].estimated_profit;
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

export default router;