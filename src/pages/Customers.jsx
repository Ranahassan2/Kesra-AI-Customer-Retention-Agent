import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Upload, Trash2, Edit2, Download, CheckSquare } from 'lucide-react';
import { useData } from '../store/dataStore';
import RiskBadge from '../components/RiskBadge';
import HealthBar from '../components/HealthBar';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 15;

export default function Customers() {
  const navigate = useNavigate();
  const { customers, addCustomer, deleteCustomer, updateCustomer, bulkUpdateCustomers } = useData();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newCust, setNewCust] = useState({ 
    customer_name: '', sector: '', plan: '', phone: '', monthly_revenue: '', support_tickets: '', 
    last_login: '', renewal_date: '', login_count_30d: '', onboarding_date: '', 
    meetings_30d: '', contact_days: '', roas: '', active_campaigns: '', 
    last_call_rating: '', performance_trend: '', contract_type: '', renewal_system: '', last_contact_notes: '', assigned_to: ''
  });
  const [editingCustId, setEditingCustId] = useState(null);
  const [riskFilter, setRiskFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('health');
  const [sortDir, setSortDir] = useState('asc');

  const [minRevenue, setMinRevenue] = useState('');
  const [maxRevenue, setMaxRevenue] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkEmployee, setBulkEmployee] = useState('');

  const sectors = [...new Set(customers.map(c => c.sector).filter(Boolean))];
  const plans   = [...new Set(customers.map(c => c.plan).filter(Boolean))];

  const filtered = useMemo(() => {
    let list = customers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.id && c.id.toLowerCase().includes(q)) || 
        (c.sector && c.sector.toLowerCase().includes(q))
      );
    }
    if (riskFilter)   list = list.filter(c => c.riskLevel === riskFilter);
    if (sectorFilter) list = list.filter(c => c.sector === sectorFilter);
    if (planFilter)   list = list.filter(c => c.plan === planFilter);
    if (minRevenue)   list = list.filter(c => c.revenue >= Number(minRevenue));
    if (maxRevenue)   list = list.filter(c => c.revenue <= Number(maxRevenue));
    
    list = [...list].sort((a, b) => {
      let va, vb;
      if (sortField === 'health') { va = a.health.score; vb = b.health.score; }
      else if (sortField === 'churn') { va = a.churnProbability; vb = b.churnProbability; }
      else if (sortField === 'revenue') { va = a.revenue; vb = b.revenue; }
      else if (sortField === 'name') { va = a.name; vb = b.name; return sortDir === 'asc' ? va.localeCompare(vb, 'ar') : vb.localeCompare(va, 'ar'); }
      else { va = a.lastActivityDays; vb = b.lastActivityDays; }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return list;
  }, [customers, search, riskFilter, sectorFilter, planFilter, minRevenue, maxRevenue, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paged.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkUpdate = (type) => {
    if (selectedIds.length === 0) return;
    if (type === 'status' && bulkStatus) {
      bulkUpdateCustomers(selectedIds, { status: bulkStatus });
      setBulkStatus('');
    } else if (type === 'employee' && bulkEmployee) {
      bulkUpdateCustomers(selectedIds, { assignedTo: bulkEmployee });
      setBulkEmployee('');
    }
    setSelectedIds([]);
  };

  const exportToExcel = () => {
    if (filtered.length === 0) return;
    
    const exportData = filtered.map(c => ({
      'Customer Name': c.name || '',
      'Sector': c.sector || '',
      'Plan': c.plan || '',
      'Monthly Revenue (SAR)': c.revenue || 0,
      'Health Score': c.health?.score || 0,
      'Risk Level': c.riskLevel === 'high' ? 'High' : c.riskLevel === 'medium' ? 'Medium' : 'Low',
      'Account Status': c.status || 'New',
      'Assigned To': c.assignedTo || '',
      'Renewal Date': c.renewalDate || '',
      'Last Interaction': c.lastActivity || '',
      'Days since last interaction': c.lastActivityDays || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!customers.length) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--header-height))' }}>
        <div style={{ textAlign: 'center', maxWidth: 350 }}>
          <div style={{ fontSize: 64, marginBottom: 16, filter: 'hue-rotate(220deg) saturate(1.5)', opacity: 0.9 }}>👥</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>لا توجد بيانات عملاء حالياً</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>يجب على الإدارة رفع بيانات Customers من خلال لوحة تحكم الإدمن حتى تظهر هنا.</div>
        </div>
      </div>
    );
  }

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortTh = ({ field, label }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(field)}>
      {label} {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="page-content">
      {/* Filters & Top Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" style={{ fontSize: 13, padding: '10px 20px' }} onClick={() => setShowAdd(true)}>
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>+</span> Add Customer
          </button>
          <button className="btn btn-secondary" style={{ fontSize: 13, padding: '10px 16px', gap: 6 }} onClick={exportToExcel} disabled={filtered.length === 0}>
            <Download size={15} /> Export to Excel
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} نتيجة</div>
          <select className="filter-select" value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}>
            <option value="">All Plans</option>
            {plans.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="filter-select" value={riskFilter} onChange={e => { setRiskFilter(e.target.value); setPage(1); }}>
            <option value="">All Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className={`btn ${showAdvancedFilters ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 13 }} onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <SlidersHorizontal size={14} /> Filter
          </button>
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input placeholder="Search by name, sector, plan..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {showAdvancedFilters && (
        <div className="card premium-card" style={{ marginBottom: 20, display: 'flex', gap: 16, padding: 16, background: 'var(--bg-secondary)', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>أقل إيراد (SAR)</label>
            <input type="number" className="filter-select" placeholder="مثال: 1000" value={minRevenue} onChange={e => { setMinRevenue(e.target.value); setPage(1); }} style={{ width: 150, background: 'var(--bg-card)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>أعلى إيراد (SAR)</label>
            <input type="number" className="filter-select" placeholder="مثال: 5000" value={maxRevenue} onChange={e => { setMaxRevenue(e.target.value); setPage(1); }} style={{ width: 150, background: 'var(--bg-card)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>Filter بSector</label>
            <select className="filter-select" value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(1); }} style={{ width: 150, background: 'var(--bg-card)' }}>
              <option value="">All Sectors</option>
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
             <button className="btn btn-secondary" onClick={() => { setMinRevenue(''); setMaxRevenue(''); setPlanFilter(''); setRiskFilter(''); setSectorFilter(''); setSearch(''); setPage(1); }}>
               Reset Filters
             </button>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#60A5FA', fontWeight: 'bold', fontSize: 13 }}>
            <CheckSquare size={16} /> Selected {selectedIds.length} customer(s)
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <select className="filter-select" style={{ width: 140 }} value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                <option value="">Change Status...</option>
                <option value="New">New</option>
                <option value="Started">Started</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Resolved">Resolved</option>
              </select>
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleBulkUpdate('status')} disabled={!bulkStatus}>Apply</button>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" className="filter-select" placeholder="Employee Name..." style={{ width: 140 }} value={bulkEmployee} onChange={e => setBulkEmployee(e.target.value)} />
              <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleBulkUpdate('employee')} disabled={!bulkEmployee}>تعيين</button>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }} onClick={() => {
              if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} customer(s)؟`)) {
                selectedIds.forEach(id => deleteCustomer(id));
                setSelectedIds([]);
              }
            }}>
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <div className="card premium-card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table className="premium-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={paged.length > 0 && selectedIds.length === paged.length} />
                </th>
                <th>Customer</th>
                <th>Sector</th>
                <th>Plan</th>
                <SortTh field="health" label="Health Score" />
                <th>Risk Level</th>
                <SortTh field="activity" label="Last Login" />
                <SortTh field="revenue" label="Monthly Revenue" />
                <th>Renewal Date</th>
                <th>Assigned To</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => (
                <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                  <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                  </td>
                  <td>
                    <div className="customer-cell">
                      <div className="customer-avatar" style={{ background: c.color }}>{c.initials}</div>
                      <div>
                        <div className="customer-name">{c.name}</div>
                        <div className="customer-id" style={{ color: 'var(--text-muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          {c.phone && (
                            <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#10B981', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }} onClick={e => e.stopPropagation()}>
                              <span style={{ fontSize: 13 }}>📱</span> {c.phone}
                            </a>
                          )}
                          <span>{c.rawMetrics?.contactDays || 0} أيام تواصل</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><span className="sector-badge">{c.sector}</span></td>
                  <td><span className="sector-badge">{c.plan}</span></td>
                  <td><HealthBar score={c.health.score} /></td>
                  <td><RiskBadge level={c.riskLevel} status={c.status} /></td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.lastActivity}</td>
                  <td style={{ fontWeight: 700 }}>{c.revenue.toLocaleString()} SAR</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.renewalDate ? new Date(c.renewalDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</td>
                  <td>
                    <input 
                      className="filter-select" 
                      placeholder="Employee Name..." 
                      style={{ background: 'var(--bg-card)', padding: '4px 8px', fontSize: 12, width: 100 }}
                      value={c.assignedTo || ''}
                      onChange={e => {
                        updateCustomer(c.id, { assignedTo: e.target.value });
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        className="filter-select"
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: 12,
                          background: (c.status === 'Resolved' || c.status === 'New' || !c.status) ? 'rgba(16, 185, 129, 0.15)' : c.status === 'Follow-up' ? 'rgba(245, 158, 11, 0.15)' : c.status === 'Started' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-card)',
                          color: (c.status === 'Resolved' || c.status === 'New' || !c.status) ? '#10B981' : c.status === 'Follow-up' ? '#F59E0B' : c.status === 'Started' ? '#C084FC' : 'var(--text-primary)',
                          border: (c.status === 'Resolved' || c.status === 'New' || !c.status) ? '1px solid rgba(16, 185, 129, 0.3)' : c.status === 'Follow-up' ? '1px solid rgba(245, 158, 11, 0.3)' : c.status === 'Started' ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid var(--border-color)',
                          fontWeight: 600
                        }}
                        value={c.status || 'New'}
                        onChange={e => {
                          e.stopPropagation();
                          const newStatus = e.target.value;
                          if (newStatus === 'Resolved') {
                            const currentScore = c.health?.score || 50;
                            const boostedScore = Math.min(100, Math.max(currentScore + 25, 80));
                            const updatedData = {
                              status: newStatus,
                              riskLevel: 'low',
                              health: {
                                ...c.health,
                                score: boostedScore,
                                support: Math.min(100, (c.health?.support || 50) + 30),
                              },
                              churnProbability: Math.max(5, (c.churnProbability || 50) - 35),
                            };
                            console.log('✅ Updating to Resolved:', updatedData);
                            updateCustomer(c.id, updatedData);
                          } else {
                            updateCustomer(c.id, { status: newStatus });
                          }
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="New">New</option>
                        <option value="Started">Started</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                      
                      <button className="premium-action-btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => { e.stopPropagation(); navigate(`/customers/${c.id}`); }}>
                        <span style={{ transform: 'rotate(180deg)' }}>➚</span> Analyze
                      </button>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                        onClick={e => { 
                          e.stopPropagation(); 
                          setEditingCustId(c.id);
                          setNewCust({
                            customer_name: c.name || '',
                            sector: c.sector || '',
                            plan: c.plan || '',
                            phone: c.phone || '',
                            monthly_revenue: c.revenue || '',
                            support_tickets: c.rawMetrics?.tickets || '',
                            last_login: c.rawMetrics?.lastLogin || '',
                            renewal_date: c.renewalDate || '',
                            login_count_30d: c.rawMetrics?.logins || '',
                            onboarding_date: c.rawMetrics?.onboardingDate || '',
                            meetings_30d: c.rawMetrics?.meetings30d || '',
                            contact_days: c.rawMetrics?.contactDays || '',
                            roas: c.rawMetrics?.roas || '',
                            active_campaigns: c.rawMetrics?.activeCampaigns || '',
                            last_call_rating: c.rawMetrics?.lastCallRating || '',
                            performance_trend: c.rawMetrics?.performanceTrend || '',
                            contract_type: c.rawMetrics?.contractType || '',
                            renewal_system: c.rawMetrics?.renewalSystem || '',
                            last_contact_notes: c.rawMetrics?.lastContactNotes || '',
                            assigned_to: c.assignedTo || ''
                          });
                          setShowAdd(true);
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                        onClick={e => { e.stopPropagation(); deleteCustomer(c.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p = page <= 4 ? i + 1 : page + i - 3;
              if (p > totalPages) return null;
              return <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        )}
      </div>


      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card premium-card" style={{ width: 600, maxWidth: '90vw', padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>{editingCustId ? 'Edit Customer' : 'Add New Customer'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '65vh', overflowY: 'auto', paddingRight: 8 }}>
              <input className="filter-select" placeholder="Customer Name / الشركة" value={newCust.customer_name} onChange={e => setNewCust({...newCust, customer_name: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="Sector" value={newCust.sector} onChange={e => setNewCust({...newCust, sector: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="Plan" value={newCust.plan} onChange={e => setNewCust({...newCust, plan: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="Phone Number (مثال: 9665...)" value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="Assigned To" value={newCust.assigned_to} onChange={e => setNewCust({...newCust, assigned_to: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="تاريخ بداية التعاقد" type="text" onFocus={(e) => (e.target.type = "date")} onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }} value={newCust.onboarding_date} onChange={e => setNewCust({...newCust, onboarding_date: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="Renewal Date" type="text" onFocus={(e) => (e.target.type = "date")} onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }} value={newCust.renewal_date} onChange={e => setNewCust({...newCust, renewal_date: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="تاريخ آخر دخول/تواصل" type="text" onFocus={(e) => (e.target.type = "date")} onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }} value={newCust.last_login} onChange={e => setNewCust({...newCust, last_login: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="نوع العقد (شهري/سنوي)" value={newCust.contract_type} onChange={e => setNewCust({...newCust, contract_type: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="نظام التNew (تلقائي/يدوي)" value={newCust.renewal_system} onChange={e => setNewCust({...newCust, renewal_system: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="Monthly Revenue (SAR)" type="number" value={newCust.monthly_revenue} onChange={e => setNewCust({...newCust, monthly_revenue: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="عدد الشكاوى/التذاكر" type="number" value={newCust.support_tickets} onChange={e => setNewCust({...newCust, support_tickets: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="الاجتماعات (30 يوم)" type="number" value={newCust.meetings_30d} onChange={e => setNewCust({...newCust, meetings_30d: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="Contact Days" type="number" value={newCust.contact_days} onChange={e => setNewCust({...newCust, contact_days: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="العائد (ROAS)" type="number" step="0.1" value={newCust.roas} onChange={e => setNewCust({...newCust, roas: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="Active Campaigns" type="number" value={newCust.active_campaigns} onChange={e => setNewCust({...newCust, active_campaigns: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="filter-select" placeholder="Performance Trend (Improving/Declining)" value={newCust.performance_trend} onChange={e => setNewCust({...newCust, performance_trend: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
                <input className="filter-select" placeholder="تقييم المكالمة (1-5)" type="number" min="1" max="5" value={newCust.last_call_rating} onChange={e => setNewCust({...newCust, last_call_rating: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6 }} />
              </div>
              <textarea className="filter-select" placeholder="Last Contact Notes" value={newCust.last_contact_notes} onChange={e => setNewCust({...newCust, last_contact_notes: e.target.value})} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: 6, minHeight: 60 }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setEditingCustId(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if(newCust.customer_name) {
                  if (editingCustId) {
                    updateCustomer(editingCustId, newCust);
                  } else {
                    addCustomer(newCust);
                  }
                  setShowAdd(false);
                  setEditingCustId(null);
                  setNewCust({
                    customer_name: '', sector: '', plan: '', phone: '', monthly_revenue: '', support_tickets: '',
                    last_login: '', renewal_date: '', login_count_30d: '', onboarding_date: '',
                    meetings_30d: '', contact_days: '', roas: '', active_campaigns: '',
                    last_call_rating: '', performance_trend: '', contract_type: '', renewal_system: '', last_contact_notes: '', assigned_to: ''
                  });
                }
              }}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
