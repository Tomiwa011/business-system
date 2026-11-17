import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { formatDateTime, formatMoney } from '../utils/format.js';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'card', label: 'Card' },
];

// Money maths in kobo (whole numbers) so decimals never drift
function lineKobo(price, quantity) {
  return Math.round(Number(price) * 100) * (Number(quantity) || 0);
}

function isValidQty(q) {
  const n = Number(q);
  return q !== '' && Number.isInteger(n) && n >= 1;
}

// After products reload, make the cart match the latest stock and prices
function syncCart(cart, products) {
  return cart.flatMap((item) => {
    const fresh = products.find((p) => p.id === item.product_id);
    if (!fresh || fresh.stock_quantity < 1) return [];
    const quantity =
      item.quantity === '' ? '' : Math.min(Number(item.quantity), fresh.stock_quantity);
    return [{ ...item, price: fresh.price, stock: fresh.stock_quantity, quantity }];
  });
}

export default function NewSale() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api('/products');
      setProducts(data.products);
      setCart((prev) => syncCart(prev, data.products));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  }, [products, search]);

  const totalKobo = cart.reduce((sum, item) => sum + lineKobo(item.price, item.quantity), 0);
  const cartIsValid = cart.length > 0 && cart.every((item) => isValidQty(item.quantity));

  function addToCart(product) {
    setError('');
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        const next = Math.min((Number(existing.quantity) || 0) + 1, product.stock_quantity);
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: next } : i));
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          stock: product.stock_quantity,
          quantity: 1,
        },
      ];
    });
  }

  function changeQuantity(productId, raw) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        if (raw === '') return { ...item, quantity: '' };
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) return item;
        return { ...item, quantity: Math.min(Math.max(n, 1), item.stock) };
      })
    );
  }

  function normaliseQuantity(productId) {
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId && item.quantity === '' ? { ...item, quantity: 1 } : item
      )
    );
  }

  function step(productId, delta) {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id !== productId) return item;
        const next = (Number(item.quantity) || 0) + delta;
        return { ...item, quantity: Math.min(Math.max(next, 1), item.stock) };
      })
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  async function handleSubmit() {
    if (!cartIsValid || submitting) return;
    setError('');
    setSubmitting(true);

    try {
      const data = await api('/sales', {
        method: 'POST',
        body: {
          items: cart.map((i) => ({ product_id: i.product_id, quantity: Number(i.quantity) })),
          payment_method: paymentMethod,
        },
      });
      setReceipt(data.sale);
      setCart([]);
      setPaymentMethod('cash');
      setSearch('');
      await load();
    } catch (err) {
      setError(err.message);
      await load(); // refresh stock so the cashier sees what changed
    } finally {
      setSubmitting(false);
    }
  }

  function startNewSale() {
    setReceipt(null);
    setError('');
  }

  if (loading) return <p className="text-gray-500">Loading products...</p>;

  if (loadError && products.length === 0) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
        {loadError}
      </div>
    );
  }

  // ---------- Receipt view ----------
  if (receipt) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-6">
        <div className="text-center mb-4">
          <div className="text-green-600 text-4xl">✓</div>
          <h1 className="text-xl font-bold text-gray-900">Sale recorded</h1>
          <p className="text-sm text-gray-500">
            Sale #{receipt.id} · {formatDateTime(receipt.created_at)}
          </p>
        </div>

        <table className="w-full text-sm mb-4">
          <thead className="text-gray-500 text-left border-b">
            <tr>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 font-medium text-right">Qty</th>
              <th className="py-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {receipt.items.map((item) => (
              <tr key={item.product_id}>
                <td className="py-2">
                  {item.name}
                  <div className="text-xs text-gray-500">{formatMoney(item.unit_price)} each</div>
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">
                  {formatMoney(lineKobo(item.unit_price, item.quantity) / 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between border-t pt-3 text-base font-semibold text-gray-900">
          <span>Total</span>
          <span>{formatMoney(receipt.total_amount)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 capitalize">Paid by {receipt.payment_method}</p>

        <button
          onClick={startNewSale}
          className="mt-6 w-full bg-indigo-600 text-white text-sm font-medium rounded-md py-2.5 hover:bg-indigo-700"
        >
          New sale
        </button>
      </div>
    );
  }

  // ---------- Sale screen ----------
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">New sale</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Products */}
        <section className="bg-white rounded-lg shadow p-4">
          <input
            type="search"
            placeholder="Search name or SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {visibleProducts.length === 0 && (
              <li className="py-6 text-center text-sm text-gray-500">No products found.</li>
            )}

            {visibleProducts.map((p) => {
              const inCart = cart.find((i) => i.product_id === p.id);
              const outOfStock = p.stock_quantity === 0;
              const atMax = inCart && Number(inCart.quantity) >= p.stock_quantity;

              return (
                <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className={outOfStock ? 'opacity-50' : ''}>
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.sku} · {formatMoney(p.price)} ·{' '}
                      {outOfStock ? 'Out of stock' : `${p.stock_quantity} left`}
                    </p>
                  </div>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={outOfStock || atMax}
                    className="shrink-0 px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {inCart ? 'Add more' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Cart */}
        <section className="bg-white rounded-lg shadow p-4 h-fit">
          <h2 className="font-semibold text-gray-900 mb-3">Cart</h2>

          {error && (
            <div className="mb-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              Nothing here yet. Add products from the list.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {cart.map((item) => (
                <li key={item.product_id} className="py-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatMoney(item.price)} each</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="text-xs text-red-600 hover:underline self-start"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => step(item.product_id, -1)}
                        aria-label="Decrease quantity"
                        className="w-8 h-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => changeQuantity(item.product_id, e.target.value)}
                        onBlur={() => normaliseQuantity(item.product_id)}
                        aria-label={`Quantity of ${item.name}`}
                        className="w-16 h-8 rounded-md border border-gray-300 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => step(item.product_id, 1)}
                        aria-label="Increase quantity"
                        className="w-8 h-8 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-500 ml-2">of {item.stock}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatMoney(lineKobo(item.price, item.quantity) / 100)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t mt-3 pt-3">
            <div className="flex justify-between text-base font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatMoney(totalKobo / 100)}</span>
            </div>

            <label htmlFor="payment" className="block text-sm font-medium text-gray-700 mt-4 mb-1">
              Payment method
            </label>
            <select
              id="payment"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleSubmit}
              disabled={!cartIsValid || submitting}
              className="mt-4 w-full bg-green-600 text-white text-sm font-medium rounded-md py-2.5 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Recording sale...' : 'Complete sale'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}