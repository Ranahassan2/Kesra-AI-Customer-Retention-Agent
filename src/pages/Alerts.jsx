import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Plus } from 'lucide-react';
import Papa from 'papaparse';
import { generatePortfolioRiskSuggestions } from '../lib/geminiService';
import { useData } from '../store/dataStore';
import RiskBadge from '../components/RiskBadge';

const PAGE_SIZE = 15;

export default function Alerts() {
  const navigate = useNavigate();
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlertData, setNewAlertData] = useState({ customerId: '', reason: '', severity: 'حرج', churnPct: 50 });
  const { customers, liveAlerts, dismissAlert, customAlerts = [], addCustomAlert, deleteCustomAlert } = useData();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  if (!customers.length) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56 }}>🔔</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>لا توجد بيانات</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>ارفع ملف Customers أولاً لرؤية التنبيهات</div>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}><Upload size={14} /> رفع الملف</button>
        </div>
      </div>
    );
  }

  // Build alerts from customers
  const systemAlerts = customers
    .filter(c => c.riskLevel === 'high' || c.riskLevel === 'medium' || c.churnProbability > 50)
    .map((c, i) => {
      let alertReason = 'انخفاض التفاعل';
      if (c.rawMetrics?.tickets > 0) alertReason = 'وجود شكاوى تذاكر دعم فني (' + c.rawMetrics.tickets + ' تذاكر)';
      else if (c.health.payment < 60) alertReason = 'تأخر أو تعثر في سداد المستحقات';
      else if (c.rawMetrics?.performanceTrend === 'Declining') alertReason = 'Declining واضح في أداء الحساب مؤخراً';
      else if (c.rawMetrics?.roas > 0 && c.rawMetrics?.roas < 2) alertReason = 'عائد الإنفاق الإعلاني (ROAS) ضعيف جداً';
      else if (c.rawMetrics?.activeCampaigns === 0) alertReason = 'لا توجد حملات نشطة حالياً';
      else if (c.daysToRenewal < 30) alertReason = 'اقتراب موعد التNew مع مؤشرات مقلقة';
      else if (c.health.usage < 40) alertReason = 'انخفاض ملحوظ في استخدام المنصة';

      return {
        id: `SYS-${c.id}`,
        customer: c,
        reason: alertReason,
        severity: c.riskLevel === 'high' || c.churnProbability > 70 ? 'حرج' : 'Medium',
        status: i % 3 === 0 ? 'New' : i % 3 === 1 ? 'قيد الFollow-up' : 'Resolved',
        churnPct: c.churnProbability,
        isCustom: false
      };
    });

  const combinedAlerts = [...systemAlerts, ...customAlerts.map(a => ({
    ...a,
    customer: customers.find(c => c.id === a.customerId) || customers[0]
  }))].sort((a, b) => (b.isCustom ? 1 : 0) - (a.isCustom ? 1 : 0));

  const filtered = filter ? combinedAlerts.filter(a => a.severity === filter || a.status === filter) : combinedAlerts;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const criticalCount  = combinedAlerts.filter(a => a.severity === 'حرج').length;
  const mediumCount    = combinedAlerts.filter(a => a.severity === 'Medium').length;
  const resolvedCount  = combinedAlerts.filter(a => a.status === 'Resolved').length;
  const followingCount = combinedAlerts.filter(a => a.status === 'قيد الFollow-up').length;

  const [aiSuggestions, setAiSuggestions] = useState([
    { icon: '📞', text: `تواصل استباقي مع عملاء التNew خلال 15 يوماً من المتوقع تقليل الانسحاب بنسبة 20%` },
    { icon: '🎧', text: `تحسين تجربة الدعم وتقليل وقت الاستجابة المتوقع رفع معدل الاستبقاء بنسبة 8%` },
    { icon: '🎁', text: `إرسال عروض مخصصة للعملاء ذوي الاستخدام الLow قد يرفع المشاركة بنسبة 15%` },
  ]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await generatePortfolioRiskSuggestions(customers);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to generate suggestions', error);
      // Fallback or show error
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleExport = () => {
    const csvData = combinedAlerts.map(a => ({
      'معرف التنبيه': a.id,
      'Customer': a.customer?.name || 'غير معروف',
      'Sector': a.customer?.sector || '',
      'مستوى الخطورة': a.severity,
      'سبب التنبيه': a.reason,
      'احتمالية المغادرة %': a.churnPct,
      'الحالة': a.status,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تنبيهات_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Risk Alerts</div>
          <div className="page-subtitle">Follow-up التنبيهات الحرجة والفرص التي تحتاج تدخل سريع</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={handleExport}><Download size={13} /> تصدير</button>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowAddAlert(true)}><Plus size={13} /> إنشاء تنبيه</button>
        </div>
      </div>

      {showAddAlert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card premium-card" style={{ width: 400, padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>إنشاء تنبيه يدوي</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select className="filter-select" style={{ width: '100%', background: 'var(--bg-secondary)', padding: 10 }} value={newAlertData.customerId} onChange={e => setNewAlertData({...newAlertData, customerId: e.target.value})}>
                <option value="">اختر Customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="filter-select" placeholder="سبب التنبيه (مثال: تأخر في الرد)" value={newAlertData.reason} onChange={e => setNewAlertData({...newAlertData, reason: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', color: '#fff' }} />
              <select className="filter-select" style={{ width: '100%', background: 'var(--bg-secondary)', padding: 10 }} value={newAlertData.severity} onChange={e => setNewAlertData({...newAlertData, severity: e.target.value})}>
                <option value="حرج">حرج</option>
                <option value="Medium">Medium</option>
              </select>
              <input type="number" className="filter-select" placeholder="احتمالية المغادرة %" value={newAlertData.churnPct} onChange={e => setNewAlertData({...newAlertData, churnPct: Number(e.target.value)})} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddAlert(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if(newAlertData.customerId && newAlertData.reason) {
                  addCustomAlert(newAlertData);
                  setShowAddAlert(false);
                  setNewAlertData({ customerId: '', reason: '', severity: 'حرج', churnPct: 50 });
                }
              }}>حفظ التنبيه</button>
            </div>
          </div>
        </div>
      )}

      {/* Live alerts */}
      {liveAlerts.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--danger-border)', background: 'rgba(239,68,68,0.03)' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--danger)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: 'var(--danger)', borderRadius: '50%', animation: 'pulse-dot 1s infinite' }}></span>
            تنبيهات Live ({liveAlerts.length})
          </div>
          {liveAlerts.slice(0, 5).map(alert => (
            <div key={alert.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 16 }}>🔴</span>
              <div style={{ flex: 1, fontSize: 12 }}>
                <strong>{alert.customerName}</strong> — <span style={{ color: 'var(--text-muted)' }}>{alert.message}</span>
                <span style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: 11 }}>{alert.time}</span>
              </div>
              <button onClick={() => dismissAlert(alert.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'إجمالي التنبيهات', val: combinedAlerts.length, color: 'var(--text-primary)' },
          { label: 'حرجة', val: criticalCount, color: '#EF4444' },
          { label: 'تحت الFollow-up', val: followingCount, color: '#F59E0B' },
          { label: 'تم حلها', val: resolvedCount, color: '#10B981' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="toolbar" style={{ marginBottom: 14 }}>
        {['', 'حرج', 'Medium', 'New', 'قيد الFollow-up', 'Resolved'].map((f, i) => (
          <button
            key={i}
            className={`action-btn ${filter === f ? 'active' : ''}`}
            style={{ background: filter === f ? 'var(--primary-glow)' : '', color: filter === f ? 'var(--primary-light)' : '', border: filter === f ? '1px solid var(--border-active)' : '' }}
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f || 'الكل'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Table */}
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>التنبيه</th>
                  <th>Customer</th>
                  <th>المستوى</th>
                  <th>السبب</th>
                  <th>احتمالية المغادرة</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((alert) => (
                  <tr key={alert.id} onClick={() => navigate(`/customers/${alert.customer.id}`)}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alert.id}</td>
                    <td>
                      <div className="customer-cell">
                        <div className="customer-avatar" style={{ background: alert.customer.color, width: 28, height: 28, fontSize: 10 }}>{alert.customer.initials}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{alert.customer.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{alert.customer.sector}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`alert-severity ${alert.severity === 'حرج' ? 'risk-badge high' : 'risk-badge medium'}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 160 }}>{alert.reason}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: alert.churnPct > 60 ? '#EF4444' : '#F59E0B', fontSize: 13 }}>{alert.churnPct}%</span>
                    </td>
                    <td>
                      <span className={`alert-status ${alert.status === 'New' ? 'status-new' : alert.status === 'قيد الFollow-up' ? 'status-following' : 'status-resolved'}`}>
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn" onClick={e => { e.stopPropagation(); navigate(`/customers/${alert.customer.id}`); }}>عرض</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2 + i, totalPages - 4 + i));
                return <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>اقتراحات لحد من المخاطر</span>
              <button 
                onClick={handleGenerateSuggestions} 
                disabled={isGeneratingSuggestions}
                style={{ background: 'var(--primary-light)', color: '#000', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {isGeneratingSuggestions ? 'جاري التوليد...' : 'توليد ذكي 🤖'}
              </button>
            </div>
            {isGeneratingSuggestions ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
                يقوم Artificial Intelligence بAnalyze المخاطر واقتراح حلول...
              </div>
            ) : (
              aiSuggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < aiSuggestions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.text}</div>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>توزيع التنبيهات</div>
            {[
              { label: 'حرجة', val: criticalCount, total: combinedAlerts.length, color: '#EF4444' },
              { label: 'Mediumة', val: mediumCount, total: combinedAlerts.length, color: '#F59E0B' },
              { label: 'Resolved', val: resolvedCount, total: combinedAlerts.length, color: '#10B981' },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color }}>{item.val} ({item.total > 0 ? ((item.val/item.total)*100).toFixed(0) : 0}%)</span>
                </div>
                <div className="breakdown-bar">
                  <div className="breakdown-fill" style={{ width: `${item.total > 0 ? (item.val/item.total)*100 : 0}%`, background: item.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
