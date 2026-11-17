import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function ErrorBox({ children }) {
  return (
    <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
      {children}
    </div>
  );
}

function AddUserForm({ onSubmit, onCancel }) {
  const [values, setValues] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ ...values, name: values.name.trim(), email: values.email.trim() });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full name
        </label>
        <input id="name" name="name" required value={values.name} onChange={handleChange} className={inputClass} />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input id="email" name="email" type="email" required value={values.email} onChange={handleChange} className={inputClass} />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Temporary password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">At least 8 characters. Share it with them privately.</p>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select id="role" name="role" value={values.role} onChange={handleChange} className={inputClass}>
          <option value="staff">Staff (can sell and view products)</option>
          <option value="admin">Admin (full access)</option>
        </select>
      </div>

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
          {submitting ? 'Creating...' : 'Create user'}
        </button>
      </div>
    </form>
  );
}

function PasswordForm({ user, onSubmit, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <ErrorBox>{error}</ErrorBox>}

      <p className="text-sm text-gray-600">
        Set a new password for <span className="font-medium">{user.name}</span> ({user.email}).
      </p>

      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoFocus
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
      </div>

      <div className="flex justify-end gap-2">
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
          {submitting ? 'Saving...' : 'Set password'}
        </button>
      </div>
    </form>
  );
}

export default function Users() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { type: 'add' | 'password', user? }
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api('/users');
      setUsers(data.users);
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

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    );
  }, [users, search]);

  async function handleAdd(values) {
    await api('/users', { method: 'POST', body: values });
    setNotice({ type: 'success', text: `${values.name} was added` });
    setModal(null);
    await load();
  }

  async function handlePassword(password) {
    await api(`/users/${modal.user.id}/password`, { method: 'PATCH', body: { password } });
    setNotice({ type: 'success', text: `Password updated for ${modal.user.name}` });
    setModal(null);
  }

  async function toggleActive(u) {
    const makeActive = !u.is_active;
    const question = makeActive
      ? `Reactivate ${u.name}?`
      : `Deactivate ${u.name}? They will be logged out and unable to sign in.`;
    if (!window.confirm(question)) return;

    try {
      await api(`/users/${u.id}/status`, { method: 'PATCH', body: { is_active: makeActive } });
      setNotice({ type: 'success', text: makeActive ? 'User reactivated' : 'User deactivated' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  }

  async function changeRole(u) {
    const newRole = u.role === 'admin' ? 'staff' : 'admin';
    if (!window.confirm(`Change ${u.name} to ${newRole}?`)) return;

    try {
      await api(`/users/${u.id}/role`, { method: 'PATCH', body: { role: newRole } });
      setNotice({ type: 'success', text: `${u.name} is now ${newRole}` });
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: err.message });
    }
  }

  if (loading) return <p className="text-gray-500">Loading users...</p>;
  if (loadError) return <ErrorBox>{loadError}</ErrorBox>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <button
          onClick={() => setModal({ type: 'add' })}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          + Add user
        </button>
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

      <input
        type="search"
        placeholder="Search name or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-72 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-600 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sales made</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No users match your search.
                </td>
              </tr>
            )}

            {filtered.map((u) => {
              const isMe = u.id === me.id;
              return (
                <tr key={u.id} className={u.is_active ? '' : 'bg-gray-50 text-gray-500'}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {u.name} {isMe && <span className="text-xs text-gray-500">(you)</span>}
                    </div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        u.role === 'admin'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.sales_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('en-NG', {
                      dateStyle: 'medium',
                      timeZone: 'Africa/Lagos',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => setModal({ type: 'password', user: u })}
                        className="text-indigo-600 hover:underline"
                      >
                        Reset password
                      </button>
                      {!isMe && (
                        <>
                          <button
                            onClick={() => changeRole(u)}
                            className="text-indigo-600 hover:underline"
                          >
                            {u.role === 'admin' ? 'Make staff' : 'Make admin'}
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            className={
                              u.is_active
                                ? 'text-red-600 hover:underline'
                                : 'text-green-700 hover:underline'
                            }
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal?.type === 'add' && (
        <Modal title="Add user" onClose={() => setModal(null)}>
          <AddUserForm onSubmit={handleAdd} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'password' && (
        <Modal title="Reset password" onClose={() => setModal(null)}>
          <PasswordForm user={modal.user} onSubmit={handlePassword} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}