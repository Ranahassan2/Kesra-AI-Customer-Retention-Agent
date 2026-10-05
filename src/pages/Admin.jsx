import { useState } from 'react';
import { useData } from '../store/dataStore';
import Upload from './Upload';

const ADMIN_PASSWORD = 'admin'; // For MVP, simple hardcoded password. Should be moved to .env in production

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { activityLogs, customers = [] } = useData();
  const [activeTab, setActiveTab] = useState('stats'); // stats, logs, upload

  const resolvedCount = customers.filter(c => c.status === 'Resolved').length;
  const inProgressCount = customers.filter(c => c.status === 'Follow-up' || c.status === 'Started').length;
  
  const employeeStats = {};
  customers.forEach(c => {
    if (c.assignedTo) {
      if (!employeeStats[c.assignedTo]) employeeStats[c.assignedTo] = { total: 0, resolved: 0 };
      employeeStats[c.assignedTo].total += 1;
      if (c.status === 'Resolved') employeeStats[c.assignedTo].resolved += 1;
    }
  });
  const sortedEmployees = Object.entries(employeeStats).sort((a, b) => b[1].total - a[1].total);

  const handleExport = () => {
    let csv = 'Customer Name,Sector,Plan,الإيراد,Risk Level,الحالة,Assigned To,Renewal Date\\n';
    customers.forEach(c => {
      csv += `"${c.name}","${c.sector}","${c.plan}",${c.revenue},"${c.riskLevel}","${c.status || 'New'}","${c.assignedTo || ''}","${c.renewalDate || ''}"\\n`;
    });
    const blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD || password === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('كلمة المرور غير صحيحة');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card premium-card" style={{ maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 24, fontSize: 24 }}>Admin Dashboard</h2>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              className="filter-select"
              style={{ width: '100%', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 16 }}
              placeholder="أدخل كلمة المرور..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>دخول</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="page-title">Admin Dashboard (Admin Dashboard)</div>
          <div className="page-subtitle">مراقبة النظام وCentral Data Upload</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('stats')}>
            Statistics
          </button>
          <button className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('logs')}>
            Activity Logs
          </button>
          <button className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('upload')}>
            Upload Data
          </button>
          <button className="btn btn-secondary" style={{ background: '#10B981', color: '#fff', borderColor: '#10B981' }} onClick={handleExport}>
            Export CSV ↓
          </button>
        </div>
      </div>

      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="card premium-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)' }}>{customers.length}</div>
              <div style={{ color: 'var(--text-muted)' }}>Total Customers</div>
            </div>
            <div className="card premium-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#10B981' }}>{resolvedCount}</div>
              <div style={{ color: 'var(--text-muted)' }}>Customers (Resolved)</div>
            </div>
            <div className="card premium-card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#F59E0B' }}>{inProgressCount}</div>
              <div style={{ color: 'var(--text-muted)' }}>جاري الFollow-up</div>
            </div>
          </div>
          
          <div className="card premium-card" style={{ padding: 0 }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--border-color)', fontWeight: 700, fontSize: 16 }}>
              أداء الموظفين (Leaderboard)
            </div>
            <div className="table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Assigned Customers</th>
                    <th>Customers (Resolved)</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEmployees.length > 0 ? sortedEmployees.map(([emp, stats]) => (
                    <tr key={emp}>
                      <td style={{ fontWeight: 600 }}>{emp}</td>
                      <td>{stats.total}</td>
                      <td style={{ color: '#10B981', fontWeight: 600 }}>{stats.resolved}</td>
                      <td>
                        <div style={{ width: '100%', maxWidth: 150, background: 'var(--bg-secondary)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#10B981', width: Math.round((stats.resolved / stats.total) * 100) + '%' }}></div>
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted)' }}>
                          {Math.round((stats.resolved / stats.total) * 100)}%
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>None موظفين مستلمين لعملاء حتى الآن.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card premium-card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>الإجراء</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs && activityLogs.length > 0 ? (
                  activityLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(log.time).toLocaleString('ar-EG')}
                      </td>
                      <td>
                        <span className="sector-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No activities logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="card premium-card" style={{ padding: 24 }}>
          <Upload />
        </div>
      )}
    </div>
  );
}
