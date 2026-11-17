import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-indigo-800 text-white' : 'text-indigo-100 hover:bg-indigo-500'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-white font-bold text-lg">Business Manager</span>
            <nav className="flex flex-wrap gap-1">
              <NavLink to="/" end className={linkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/new-sale" className={linkClass}>
                New Sale
              </NavLink>
              <NavLink to="/sales" className={linkClass}>
                Sales
              </NavLink>
              <NavLink to="/products" className={linkClass}>
                Products
              </NavLink>
              {user.role === 'admin' && (
                <>
                  <NavLink to="/users" className={linkClass}>
                    Users
                  </NavLink>
                  <NavLink to="/security" className={linkClass}>
                    Security
                  </NavLink>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/profile"
              className="text-indigo-100 text-sm hover:underline"
              title="My profile"
            >
              {user.name} <span className="opacity-70">({user.role})</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="bg-white text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-md hover:bg-indigo-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}