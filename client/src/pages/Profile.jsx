import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function Profile() {
  const { user } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (next !== confirm) {
      setError('The new passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api('/auth/password', {
        method: 'PATCH',
        body: { current_password: current, new_password: next },
      });
      setSuccess('Password updated. Your other sessions have been logged out.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My profile</h1>

      <section className="bg-white rounded-lg shadow p-4 mb-6">
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd className="col-span-2 text-gray-900">{user.name}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd className="col-span-2 text-gray-900">{user.email}</dd>
          <dt className="text-gray-500">Role</dt>
          <dd className="col-span-2 text-gray-900 capitalize">{user.role}</dd>
        </dl>
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Change password</h2>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              id="current"
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="next" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              id="next"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}