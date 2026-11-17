import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewSale from './pages/NewSale.jsx';
import Sales from './pages/Sales.jsx';
import Products from './pages/Products.jsx';
import Profile from './pages/Profile.jsx';
import Users from './pages/Users.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything inside here requires a logged-in user */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="new-sale" element={<NewSale />} />
          <Route path="sales" element={<Sales />} />
          <Route path="products" element={<Products />} />
          <Route path="profile" element={<Profile />} />

          {/* Admin-only pages */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="users" element={<Users />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}