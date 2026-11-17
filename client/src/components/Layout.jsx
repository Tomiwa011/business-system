import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const linkClass = ({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-top">
            <NavLink to="/" className="app-brand" aria-label="Business Manager dashboard">
              <span className="app-brand-mark" aria-hidden="true">B</span>
              <span>Business Manager</span>
            </NavLink>

            <div className="app-account">
              <NavLink to="/profile" className="app-account-link" title="My profile">
                <span className="app-account-avatar" aria-hidden="true">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="app-account-details">
                  <span className="app-account-name">{user.name}</span>
                  <span className="app-account-role">{user.role}</span>
                </span>
              </NavLink>
              <button onClick={handleLogout} className="app-logout-button">
                Log out
              </button>
            </div>
          </div>

          <nav className="app-nav" aria-label="Main navigation">
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
              <NavLink to="/users" className={linkClass}>
                Users
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
