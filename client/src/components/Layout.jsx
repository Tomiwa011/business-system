import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-top">
            <NavLink to="/" className="app-brand">
              <span className="app-brand-mark" aria-hidden="true">b.</span>
              <span>bussiness-app</span>
            </NavLink>
            <div className="app-account">
              <NavLink to="/profile" className="app-account-link" title="My profile">
                <span className="app-account-avatar" aria-hidden="true">
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
                <span className="app-account-details">
                  <span className="app-account-name">{user.name}</span>
                  <span className="app-account-role">{user.role}</span>
                </span>
              </NavLink>
              <button onClick={handleLogout} className="app-logout-button">Log out</button>
            </div>
          </div>
          <nav className="app-nav" aria-label="Business navigation">
            {[
              ['Dashboard', '/dashboard'],
              ['New sale', '/new-sale'],
              ['Sales', '/sales'],
              ['Products', '/products'],
              ...(user.role === 'admin' ? [['Users', '/users'], ['Security', '/security']] : []),
            ].map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `app-nav-link${isActive ? ' is-active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main"><Outlet /></main>
    </div>
  );
}