import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 15000, // allows time for Neon to wake up
});

// Without this, a dropped idle connection would crash the server
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

export default pool;