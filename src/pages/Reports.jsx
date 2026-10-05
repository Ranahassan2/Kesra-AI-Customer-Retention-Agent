import { useNavigate } from 'react-router-dom';
import { Download, Upload } from 'lucide-react';
import { useData } from '../store/dataStore';

function exportCSV(customers) {
  const headers = ['ID', 'الاسم', 'Sector', 'Plan', 'Health Score', 'Risk Level', 'احتمالية المغادرة', 'الإيراد', 'حالة الدفع', 'Last Login', 'Renewal Date'];
  const rows = customers.map(c => [
    c.id, c.name, c.sector, c.plan, c.health.score, c.riskLevel === 'high' ? 'High' : c.riskLevel === 'medium' ? 'Medium' : 'Low',
    c.churnProbability + '%', c.revenue, c.paymentStatus, c.lastActivity, c.renewalDate || '',
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `retention_report_${new Date().toLocaleDateString('en-CA')}.csv`; a.click();
}

export default function Reports() {
  const navigate = useNavigate();
  const { customers, stats, fileName, uploadedAt } = useData();

  if (!customers.length) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>📈</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>لا توجد تقارير</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>ارفع ملف Customers لتوليد Reports</div>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}><Upload size={14} /> رفع الملف</button>
        </div>
      </div>
    );
  }

  const highRisk   = customers.filter(c => c.riskLevel === 'high');
  const midRisk    = customers.filter(c => c.riskLevel === 'medium');
  const lowRisk    = customers.filter(c => c.riskLevel === 'low');
  const avgChurn   = Math.round(customers.reduce((a, c) => a + c.churnProbability, 0) / customers.length);
  const totalRev   = customers.reduce((a, c) => a + c.revenue, 0);
  const atRiskRev  = highRisk.reduce((a, c) => a + c.revenue, 0);
  const latePayment = customers.filter(c => c.paymentStatus !== 'مدفوع').length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">
            {fileName && <span>ملف: <strong>{fileName}</strong> · </span>}
            {uploadedAt && <span>تاريخ الAnalyze: {new Date(uploadedAt).toLocaleString('en-US')}</span>}
          </div>
        </div>
        <button className="btn btn-primary" style={{ fontSize: 13 }} onClick={() => exportCSV(customers)}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Customers', val: stats.total.toLocaleString('en-US'), color: '#3B82F6', icon: '👥' },
          { label: 'Medium احتمالية المغادرة', val: `${avgChurn}%`, color: avgChurn > 50 ? '#EF4444' : '#F59E0B', icon: '📉' },
          { label: 'إجمالي الإيراد', val: totalRev > 0 ? `${totalRev.toLocaleString()} SAR` : '—', color: '#10B981', icon: '💰' },
          { label: 'إيراد At Risk', val: atRiskRev > 0 ? `${atRiskRev.toLocaleString()} SAR` : '—', color: '#EF4444', icon: '⚠️' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '18px 14px' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Risk Distribution */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>توزيع مستويات الخطر</div>
          {[
            { label: 'High Risk', count: highRisk.length, color: '#EF4444', pct: ((highRisk.length / customers.length) * 100).toFixed(1) },
            { label: 'Medium الخطر', count: midRisk.length, color: '#F59E0B', pct: ((midRisk.length / customers.length) * 100).toFixed(1) },
            { label: 'Low الخطر', count: lowRisk.length, color: '#10B981', pct: ((lowRisk.length / customers.length) * 100).toFixed(1) },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontWeight: 700, color: item.color }}>{item.count} ({item.pct}%)</span>
              </div>
              <div className="breakdown-bar" style={{ height: 8 }}>
                <div className="breakdown-fill" style={{ width: `${item.pct}%`, background: item.color }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Health Stats */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>إحصائيات صحة Customers</div>
          {[
            { label: 'Medium Health Score', val: `${stats.avgHealth}/100`, color: stats.avgHealth > 70 ? '#10B981' : stats.avgHealth > 50 ? '#F59E0B' : '#EF4444' },
            { label: 'معدل الاحتفاظ', val: `${stats.retentionRate}%`, color: stats.retentionRate > 60 ? '#10B981' : '#F59E0B' },
            { label: 'Medium احتمالية المغادرة', val: `${avgChurn}%`, color: avgChurn > 50 ? '#EF4444' : '#F59E0B' },
            { label: 'عملاء بدفع متأخر', val: latePayment, color: latePayment > 0 ? '#EF4444' : '#10B981' },
            { label: 'عملاء بتNew خلال 30 يوم', val: customers.filter(c => c.daysToRenewal >= 0 && c.daysToRenewal <= 30).length, color: '#F59E0B' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontWeight: 800, color: item.color }}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top at-risk customers */}
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">أعلى Customers خطراً</div><div className="card-sub">الأولوية القصوى للتدخل</div></div>
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => exportCSV(highRisk)}>
            <Download size={12} /> تصدير قائمة الخطر
          </button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Customer</th><th>Sector</th><th>Health Score</th><th>احتمالية المغادرة</th><th>الإيراد</th><th>حالة الدفع</th><th>التNew</th></tr></thead>
            <tbody>
              {highRisk.slice(0, 10).map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${c.id}`)}>
                  <td><div className="customer-cell"><div className="customer-avatar" style={{ background: c.color, width: 30, height: 30, fontSize: 11 }}>{c.initials}</div><div><div className="customer-name">{c.name}</div><div className="customer-id">{c.id}</div></div></div></td>
                  <td><span className="sector-badge">{c.sector}</span></td>
                  <td><span style={{ fontWeight: 800, color: '#EF4444' }}>{c.health.score}</span></td>
                  <td><span style={{ fontWeight: 800, color: '#EF4444' }}>{c.churnProbability}%</span></td>
                  <td>{c.revenue > 0 ? `${c.revenue.toLocaleString()} SAR` : '—'}</td>
                  <td><span style={{ fontSize: 11, fontWeight: 700, color: c.paymentStatus !== 'مدفوع' ? '#EF4444' : '#10B981' }}>{c.paymentStatus}</span></td>
                  <td style={{ fontSize: 12, color: c.daysToRenewal < 30 ? '#EF4444' : 'var(--text-muted)' }}>
                    {c.renewalDate || '—'}
                    {c.daysToRenewal < 30 && c.daysToRenewal >= 0 && <span style={{ marginRight: 4, fontSize: 10 }}>({c.daysToRenewal} يوم)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
