import { useNavigate } from 'react-router-dom';
import { useData } from '../store/dataStore';
import { Trash2, Edit } from 'lucide-react';
import HealthBar from '../components/HealthBar';

export default function Settings() {
  const navigate = useNavigate();
  const { customers, stats, fileName, uploadedAt, uploads, clearData, deleteUpload } = useData();
  
  const displayUploads = (uploads && uploads.length > 0) 
    ? uploads 
    : (fileName ? [{ id: 1, fileName, uploadedAt, customerCount: customers.length, avgHealth: stats?.avgHealth }] : []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">إعدادات النظام وإدارة البيانات</div>
        </div>
      </div>

      {/* Current data status */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">البيانات الحالية</div>
        {customers.length > 0 ? (
          <>
            <div className="table-wrapper" style={{ margin: '0 -20px 16px -20px' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>اسم الملف</th>
                    <th>تاريخ ووقت الAnalyze</th>
                    <th>عدد Customers</th>
                    <th>Medium الصحة</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayUploads.map((upload, index) => (
                    <tr key={upload.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{upload.fileName || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{upload.uploadedAt ? new Date(upload.uploadedAt).toLocaleString('en-US') : '—'}</td>
                      <td>{Number(upload.customerCount).toLocaleString('en-US')}</td>
                      <td>{upload.avgHealth ? <HealthBar score={upload.avgHealth} /> : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 8, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => navigate('/customers')}
                            title="تعديل البيانات"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 8, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => { if (confirm('هل أنت متأكد من حذف هذا الملف وبياناته؟')) { deleteUpload(upload.id); } }}
                            title="حذف هذا الملف"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            لا توجد بيانات محملة.
            <button className="btn btn-primary" style={{ marginRight: 12, fontSize: 12 }} onClick={() => navigate('/upload')}>رفع الملف</button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-label">معلومات النظام</div>
        {[
          { label: 'إصدار النظام', val: '1.0.0' },
          { label: 'محرك الـ AI', val: 'Rule-based Scoring Engine v1' },
          { label: 'التخزين', val: 'localStorage (المتصفح)' },
          { label: 'المراقبة الحية', val: 'كل 30 ثانية' },
          { label: 'الصيغ المدعومة', val: 'CSV, Excel (.xlsx, .xls)' },
          { label: 'الحد الأقصى للعملاء', val: '100,000 customer(s)' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontWeight: 700 }}>{item.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
