import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatCompactMoney, formatMoney } from '../utils/format.js';

function StatCard({ label, value, hint }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Card({ title, action, className = '', children }) {
  return (
    <section className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }) {
  return <p className="py-6 text-center text-sm text-gray-500">{children}</p>;
}

// "2026-11-17" -> "Tue"
function weekday(dateString) {
  return new Date(`${dateString}T00:00:00Z`).toLocaleDateString('en-NG', {
    weekday: 'short',
    timeZone: 'UTC',
  });
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await api('/dashboard');
      setData(result);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
        {error}
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500">Loading dashboard...</p>;
  }

  const days = data.last_7_days;
  const maxRevenue = Math.max(...days.map((d) => Number(d.revenue)), 0);
  const weekRevenue = days.reduce((sum, d) => sum + Number(d.revenue), 0);

  const topMaxUnits = Math.max(...data.top_products.map((p) => p.units_sold), 1);
  const paymentTotal = data.payment_methods.reduce((sum, m) => sum + Number(m.revenue), 0);

  const hasProfit = data.estimated_profit_this_month !== undefined;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          {isAdmin ? 'Business overview' : 'My overview'}
        </h1>
        <button
          onClick={load}
          disabled={refreshing}
          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Sales today" value={data.summary.today_count} />
        <StatCard label="Revenue today" value={formatMoney(data.summary.today_revenue)} />
        <StatCard label="Sales this month" value={data.summary.month_count} />
        <StatCard label="Revenue this month" value={formatMoney(data.summary.month_revenue)} />
        {hasProfit && (
          <StatCard
            label="Est. profit this month"
            value={formatMoney(data.estimated_profit_this_month)}
            hint="Uses each product's current cost price"
          />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 7-day chart */}
        <Card title="Last 7 days" className="lg:col-span-2">
          <p className="text-xs text-gray-500 -mt-2 mb-3">
            {formatMoney(weekRevenue)} in revenue over the week
          </p>

          <div className="flex items-end gap-2 h-44">
            {days.map((day, index) => {
              const revenue = Number(day.revenue);
              const pct = maxRevenue > 0 ? (revenue / maxRevenue) * 85 : 0;
              const isToday = index === days.length - 1;

              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${formatMoney(revenue)} from ${day.sales_count} sale(s)`}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-1"
                >
                  <span className="text-[10px] text-gray-500 h-3">
                    {revenue > 0 ? formatCompactMoney(revenue) : ''}
                  </span>
                  <div
                    className={`w-full max-w-12 rounded-t ${isToday ? 'bg-indigo-600' : 'bg-indigo-300'}`}
                    style={{ height: `${revenue > 0 ? Math.max(pct, 3) : 1}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-1">
            {days.map((day) => (
              <span key={day.date} className="flex-1 text-center text-xs text-gray-600">
                {weekday(day.date)}
              </span>
            ))}
          </div>
        </Card>

        {/* Payment methods */}
        <Card title="Payments this month">
          {data.payment_methods.length === 0 ? (
            <EmptyNote>No sales this month yet.</EmptyNote>
          ) : (
            <ul className="space-y-4">
              {data.payment_methods.map((m) => {
                const share = paymentTotal > 0 ? (Number(m.revenue) / paymentTotal) * 100 : 0;
                return (
                  <li key={m.payment_method}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize text-gray-800">{m.payment_method}</span>
                      <span className="text-gray-600">
                        {formatMoney(m.revenue)} · {Math.round(share)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded mt-1">
                      <div className="h-2 bg-indigo-500 rounded" style={{ width: `${share}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{m.sales_count} sale(s)</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Top products */}
        <Card title="Top products (30 days)" className="lg:col-span-1">
          {data.top_products.length === 0 ? (
            <EmptyNote>No sales in the last 30 days.</EmptyNote>
          ) : (
            <ol className="space-y-3">
              {data.top_products.map((p, i) => (
                <li key={p.id}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-gray-800">
                      {i + 1}. {p.name}
                    </span>
                    <span className="text-gray-600 shrink-0">{p.units_sold} sold</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded mt-1">
                    <div
                      className="h-1.5 bg-green-500 rounded"
                      style={{ width: `${(p.units_sold / topMaxUnits) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatMoney(p.revenue)}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Low stock */}
        <Card
          title={`Low stock (${data.low_stock.length})`}
          className="lg:col-span-2"
          action={
            <Link to="/products" className="text-sm text-indigo-600 hover:underline">
              View products
            </Link>
          }
        >
          {data.low_stock.length === 0 ? (
            <EmptyNote>Everything is well stocked.</EmptyNote>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {data.low_stock.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {p.sku} · alert at {p.low_stock_threshold}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs shrink-0 ${
                      p.stock_quantity === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {p.stock_quantity === 0 ? 'Out of stock' : `${p.stock_quantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}