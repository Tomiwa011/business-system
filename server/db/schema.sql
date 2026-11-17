-- Business Manager database schema
-- Run this once on a brand-new, empty database.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'staff'
                CHECK (role IN ('admin', 'staff')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  token_version INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(150)  NOT NULL,
  sku                 VARCHAR(50)   NOT NULL UNIQUE,
  category            VARCHAR(100),
  price               NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  cost_price          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  stock_quantity      INTEGER       NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER       NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE sales (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER       NOT NULL REFERENCES users(id),
  total_amount   NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  payment_method VARCHAR(30)   NOT NULL DEFAULT 'cash'
                 CHECK (payment_method IN ('cash', 'transfer', 'card')),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  id         SERIAL PRIMARY KEY,
  sale_id    INTEGER       NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER       NOT NULL REFERENCES products(id),
  quantity   INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);