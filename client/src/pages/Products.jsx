import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatMoney } from '../utils/format.js';
import Modal from '../components/Modal.jsx';
import ProductForm from '../components/ProductForm.jsx';
import RestockForm from '../components/RestockForm.jsx';

function StockBadge({ product }) {
  if (!product.is_active) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700">Inactive</span>;
  }
  if (product.stock_quantity === 0) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Out of stock</span>;
  }
  if (product.is_low_stock) {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">Low stock</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">In stock</span>;
}

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [lowOnly, setLowOnly] = useState(false);

  // modal is null or { type: 'add' | 'edit' | 'restock', product? }
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

  const load = useCallback(async () => {
    try {
      const data = await api('/products?status=all');
      setProducts(data.products);
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

  // Hide the notice after a few seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;
      if (category && p.category !== category) return false;
      if (lowOnly && !p.is_low_stock) return false;
      if (term && !p.name.toLowerCase().includes(term) && !p.sku.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [products, search, category, statusFilter, lowOnly]);

  async function handleSave(payload) {
    if (modal.type === 'edit') {
      await api(`/products/${modal.product.id}`, { method: 'PUT', body: payload });
      setNotice({ type: 'success', text: 'Product updated' });
    } else {
      await api('/products', { method: 'POST', body: payload });
      setNotice({ type: 'success', text: 'Product added' });
    }
    setModal(null);
    await load();
  }

  async function handleRestock(quantity) {
    await api(`/products/${modal.product.id}/restock`, {
      method: 'PATCH',
      body: { quantity },
    });
    setNotice({ type: 'success', text: `Added ${quantity} to ${modal.product.name}` });
    setModal(null);
    await load();
  }

  async function toggleActive(product) {
    const makeActive = !product.is_active;
    const question = makeActive
      ? `Make "${product.name}" available for sale again?`
      : `Deactivate "${product.name}"? It won't be sellable, but past sales keep it.`;
    if (!window.confirm(question)) return;

    try {
      await api(`/products/${product.id}/status`, {
        method: 'PATCH',
        body: { is_active: makeActive },
      });
      setNotice({
        type: 'success',
        text: makeActive ? 'Product reactivated' : 'Product deactivated',
      });
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  }

  if (loading) return <p className="text-gray-500">Loading products...</p>;

  if (loadError) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
        {loadError}
      </div>
    );
  }

  const selectClass =
    'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        {isAdmin && (
          <button
            onClick={() => setModal({ type: 'add' })}
            className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            + Add product
          </button>
        )}
      </div>

      {notice && (
        <div
          className={`mb-4 rounded-md border text-sm px-3 py-2 ${
            notice.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          placeholder="Search name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${selectClass} w-full sm:w-64`}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <p className="text-sm text-gray-500 mb-2">
        Showing {filtered.length} of {products.length} products
      </p>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Cost</th>}
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} className="px-4 py-8 text-center text-gray-500">
                  No products match your filters.
                </td>
              </tr>
            )}

            {filtered.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'bg-gray-50 text-gray-500'}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.sku}</div>
                </td>
                <td className="px-4 py-3">{p.category || '-'}</td>
                <td className="px-4 py-3">{formatMoney(p.price)}</td>
                {isAdmin && <td className="px-4 py-3">{formatMoney(p.cost_price)}</td>}
                <td className="px-4 py-3">{p.stock_quantity}</td>
                <td className="px-4 py-3">
                  <StockBadge product={p} />
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setModal({ type: 'edit', product: p })}
                        className="text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      {p.is_active && (
                        <button
                          onClick={() => setModal({ type: 'restock', product: p })}
                          className="text-indigo-600 hover:underline"
                        >
                          Restock
                        </button>
                      )}
                      <button
                        onClick={() => toggleActive(p)}
                        className={p.is_active ? 'text-red-600 hover:underline' : 'text-green-700 hover:underline'}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal && (modal.type === 'add' || modal.type === 'edit') && (
        <Modal title={modal.type === 'add' ? 'Add product' : 'Edit product'} onClose={() => setModal(null)}>
          <ProductForm
            initial={modal.type === 'edit' ? modal.product : null}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal && modal.type === 'restock' && (
        <Modal title="Restock product" onClose={() => setModal(null)}>
          <RestockForm product={modal.product} onSubmit={handleRestock} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}