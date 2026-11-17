import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDateTime, formatMoney } from '../utils/format.js';
import Modal from '../components/Modal.jsx';

const PAGE_SIZE = 20;
const TZ = 'Africa/Lagos';

// Today's date as YYYY-MM-DD in Lagos time
function todayInLagos() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
}

// A date string minus N days, still as YYYY-MM-DD
function daysAgo(dateString, days) {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function lineTotal(price, quantity) {
  return (Math.round(Number(price) * 100) * quantity) / 100;
}

function SaleReceipt({ saleId }) {
  const [sale, setSale] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api(`/sales/${saleId}`)
      .then((data) => {
        if (!cancelled) setSale(data.sale);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [saleId]);

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
        {error}
      </div>
    );
  }

  if (!sale) return <p className="text-sm text-gray-500">Loading receipt...</p>;

  return (
    <div>
      <p className="text-sm text-gray-500">{formatDateTime(sale.created_at)}</p>
      <p className="text-sm text-gray-500 mb-3">
        Served by {sale.cashier_name} · <span className="capitalize">{sale.payment_method}</span>
      </p>

      <table className="w-full text-sm mb-3">
        <thead className="text-gray-500 text-left border-b">
          <tr>
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium text-right">Qty</th>
            <th className="py-2 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sale.items.map((item) => (
            <tr key={item.product_id}>
              <td className="py-2">
                {item.name}
                <div className="text-xs text-gray-500">{formatMoney(item.unit_price)} each</div>
              </td>
              <td className="py-2 text-right">{item.quantity}</td>
              <td className="py-2 text-right">
                {formatMoney(lineTotal(item.unit_price, item.quantity))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between border-t pt-3 font-semibold text-gray-900">
        <span>Total</span>
        <span>{formatMoney(sale.total_amount)}</span>
      </div>
    </div>
  );
}

export default function Sales() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [preset, setPreset] = useState('7d');
  const [from, setFrom] = useState(() => daysAgo(todayInLagos(), 6));
  const [to, setTo] = useState(() => todayInLagos());
  const [offset, setOffset] = useState(0);

  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState(null);

  const rangeInvalid = Boolean(from && to && from > to);

  useEffect(() => {
    if (rangeInvalid) return;

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    api(`/sales?${params}`)
      .then((data) => {
        if (cancelled) return;
        setSales(data.sales);
        setTotal(data.total);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to, offset, rangeInvalid]);

  function applyPreset(name) {
    const today = todayInLagos();
    setPreset(name);
    setOffset(0);
    if (name === 'today') {
      setFrom(today);
      setTo(today);
    } else if (name === '7d') {
      setFrom(daysAgo(today, 6));
      setTo(today);
    } else if (name === '30d') {
      setFrom(daysAgo(today, 29));
      setTo(today);
    } else {
      setFrom('');
      setTo('');
    }
  }

  function changeDate(which, value) {
    setPreset('custom');
    setOffset(0);
    if (which === 'from') setFrom(value);
    else setTo(value);
  }

  const presetButton = (name, label) => (
    <button
      key={name}
      onClick={() => applyPreset(name)}
      className={`px-3 py-1.5 text-sm rounded-md border ${
        preset === name
          ? 'bg-indigo-600 text-white border-indigo-600'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  const dateInputClass =
    'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const firstShown = total === 0 ? 0 : offset + 1;
  const lastShown = offset + sales.length;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">{isAdmin ? 'All sales' : 'My sales'}</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {presetButton('today', 'Today')}
        {presetButton('7d', 'Last 7 days')}
        {presetButton('30d', 'Last 30 days')}
        {presetButton('all', 'All time')}

        <div className="flex items-center gap-2 ml-0 sm:ml-2">
          <input
            type="date"
            aria-label="From date"
            value={from}
            max={to || undefined}
            onChange={(e) => changeDate('from', e.target.value)}
            className={dateInputClass}
          />
          <span className="text-gray-500 text-sm">to</span>
          <input
            type="date"
            aria-label="To date"
            value={to}
            min={from || undefined}
            onChange={(e) => changeDate('to', e.target.value)}
            className={dateInputClass}
          />
        </div>
      </div>

      {rangeInvalid && (
        <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
          The "from" date must be on or before the "to" date.
        </div>
      )}

      {error && !rangeInvalid && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Sale</th>
              <th className="px-4 py-3 font-medium">Date</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Cashier</th>}
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                  Loading sales...
                </td>
              </tr>
            )}

            {!loading && sales.length === 0 && !rangeInvalid && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                  No sales in this period.
                </td>
              </tr>
            )}

            {!loading &&
              sales.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">#{s.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(s.created_at)}</td>
                  {isAdmin && <td className="px-4 py-3">{s.cashier_name}</td>}
                  <td className="px-4 py-3">{s.item_count}</td>
                  <td className="px-4 py-3 capitalize">{s.payment_method}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(s.total_amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedId(s.id)}
                      className="text-indigo-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && !rangeInvalid && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            {firstShown}–{lastShown} of {total} sales
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
              disabled={offset === 0 || loading}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total || loading}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedId && (
        <Modal title={`Sale #${selectedId}`} onClose={() => setSelectedId(null)}>
          <SaleReceipt saleId={selectedId} />
        </Modal>
      )}
    </div>
  );
}