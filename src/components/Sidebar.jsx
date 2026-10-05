import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Bell, BarChart3, Upload, Settings } from 'lucide-react';
import { useData } from '../store/dataStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/customers', icon: Users, label: 'Customers' },
  { path: '/alerts', icon: Bell, label: 'Risk Alerts', alertKey: true },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/admin', icon: Upload, label: 'Admin' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { customers, stats } = useData();
  const highRisk = stats?.high || 0;
  const midRisk  = stats?.medium || 0;
  const stable   = stats ? (stats.total - highRisk - midRisk) : 0;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">ك</div>
        <div className="logo-text">
          <div className="logo-title" style={{ fontFamily: 'inherit' }}>Kesra</div>
          <div className="logo-sub">AI Customer Retention Agent</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label, alertKey }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} className="nav-icon" />
            <span>{label}</span>
            {alertKey && highRisk > 0 && <span className="nav-badge">{highRisk}</span>}
          </NavLink>
        ))}
      </nav>

      {customers.length > 0 && (
        <div className="sidebar-footer">
          <div className="customer-summary">
            <div className="summary-title">Total Customers</div>
            <div className="summary-row">
              <div className="summary-label"><div className="summary-dot" style={{ background: '#EF4444' }}></div>At Risk</div>
              <div className="summary-count" style={{ color: '#EF4444' }}>{highRisk}</div>
            </div>
            <div className="summary-row">
              <div className="summary-label"><div className="summary-dot" style={{ background: '#F59E0B' }}></div>Monitoring</div>
              <div className="summary-count" style={{ color: '#F59E0B' }}>{midRisk}</div>
            </div>
            <div className="summary-row">
              <div className="summary-label"><div className="summary-dot" style={{ background: '#10B981' }}></div>Stable</div>
              <div className="summary-count" style={{ color: '#10B981' }}>{stable}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
