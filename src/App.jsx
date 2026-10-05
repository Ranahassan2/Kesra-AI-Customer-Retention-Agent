import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './store/dataStore';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Upload from './pages/Upload';
import Settings from './pages/Settings';
import Admin from './pages/Admin';

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <Layout>
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/customers"     element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/alerts"        element={<Alerts />} />
            <Route path="/reports"       element={<Reports />} />
            <Route path="/admin"         element={<Admin />} />
            <Route path="/settings"      element={<Settings />} />
            <Route path="*"              element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </DataProvider>
    </BrowserRouter>
  );
}
