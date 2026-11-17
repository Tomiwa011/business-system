import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import pool from './db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import dashboardRoutes from './routes/dashboard.js';
import { requireAuth } from './middleware/auth.js';
import { apiLimiter, salesLimiter } from './middleware/rateLimit.js';

dotenv.config();

// Refuse to start with a missing or weak configuration
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short (need 32+ characters). Check server/.env');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Check server/.env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render's proxy, trust one hop so rate limits see real visitor IPs
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api', apiLimiter);

// Is the server alive?
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Can the server talk to the database?
app.get('/db-check', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'connected', time: result.rows[0].time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Limit how fast one user can record sales. This runs before the sales router
// and passes through (the router checks login again, which is cheap).
app.post('/api/sales', requireAuth, salesLimiter);
app.use('/api/sales', salesRoutes);

app.use('/api/dashboard', dashboardRoutes);

// Any other /api path
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Last-resort error handler: never leak stack traces
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});