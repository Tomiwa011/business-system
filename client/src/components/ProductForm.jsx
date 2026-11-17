import { useState } from 'react';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, id, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

// Used for both adding (initial = null) and editing (initial = a product)
export default function ProductForm({ initial, onSubmit, onCancel }) {
  const isEdit = Boolean(initial);

  const [values, setValues] = useState({
    name: initial?.name ?? '',
    sku: initial?.sku ?? '',
    category: initial?.category ?? '',
    price: initial?.price ?? '',
    cost_price: initial?.cost_price ?? '0',
    stock_quantity: '0',
    low_stock_threshold: initial?.low_stock_threshold ?? '5',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      category: values.category.trim(),
      price: Number(values.price),
      cost_price: Number(values.cost_price || 0),
      low_stock_threshold: Number(values.low_stock_threshold || 0),
    };
    if (!isEdit) {
      payload.stock_quantity = Number(values.stock_quantity || 0);
    }

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <Field label="Name" id="name">
        <input id="name" name="name" required value={values.name} onChange={handleChange} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" id="sku" hint="Saved in capitals">
          <input id="sku" name="sku" required value={values.sku} onChange={handleChange} className={inputClass} />
        </Field>
        <Field label="Category" id="category">
          <input id="category" name="category" value={values.category} onChange={handleChange} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Selling price (₦)" id="price">
          <input id="price" name="price" type="number" min="0" step="0.01" required value={values.price} onChange={handleChange} className={inputClass} />
        </Field>
        <Field label="Cost price (₦)" id="cost_price">
          <input id="cost_price" name="cost_price" type="number" min="0" step="0.01" value={values.cost_price} onChange={handleChange} className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!isEdit && (
          <Field label="Starting stock" id="stock_quantity">
            <input id="stock_quantity" name="stock_quantity" type="number" min="0" step="1" value={values.stock_quantity} onChange={handleChange} className={inputClass} />
          </Field>
        )}
        <Field label="Low-stock alert at" id="low_stock_threshold" hint="Warn when stock reaches this">
          <input id="low_stock_threshold" name="low_stock_threshold" type="number" min="0" step="1" value={values.low_stock_threshold} onChange={handleChange} className={inputClass} />
        </Field>
      </div>

      {isEdit && (
        <p className="text-xs text-gray-500">
          Stock can't be edited here. Use Restock to add stock; sales reduce it automatically.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  );
}