import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { parseFile, autoDetectColumns } from '../lib/csv-parser';
import { useData } from '../store/dataStore';

const FIELD_LABELS = {
  customer_name:   { label: 'Customer Name', required: true,  icon: '👤', desc: 'الاسم الكامل للcustomer(s)' },
  last_login:      { label: 'تاريخ آخر زيارة / تواصل', required: false, icon: '📅', desc: 'آخر مرة جه فيها Customer أو اتواصل مع الشركة' },
  login_count_30d: { label: 'عدد الزيارات (آخر 30 يوم)', required: false, icon: '🔢', desc: 'كم مرة زار أو تواصل Customer خلال آخر 30 يوم' },
  feature_usage:   { label: 'نسبة استخدام الخدمات %', required: false, icon: '📊', desc: 'كم % من خدمات الشركة استخدمها Customer (0 إلى 100)' },
  support_tickets: { label: 'عدد الشكاوى / المشاكل', required: false, icon: '⚠️', desc: 'عدد الشكاوى أو المشاكل اللي أبلغ عنها Customer' },
  monthly_revenue: { label: 'قيمة الخدمات / Monthly Revenue', required: false, icon: '💰', desc: 'إجمالي ما دفعه Customer شهرياً مقابل الخدمات' },
  renewal_date:    { label: 'تاريخ انتهاء أو تNew الخدمة', required: false, icon: '🔄', desc: 'موعد تNew الاشتراك أو انتهاء العقد' },
  payment_status:  { label: 'حالة الدفع', required: false, icon: '💳', desc: 'مدفوع / متأخر / معلق / متعثر' },
  sector:          { label: 'نوع / فئة Customer', required: false, icon: '🏷️', desc: 'مثال: VIP / عادي / شركات / أفراد' },
  plan:            { label: 'الخدمة أو الباقة المشترك بيها', required: false, icon: '📦', desc: 'اسم الخدمة أو الباقة' },
  email:           { label: 'البريد الإلكتروني', required: false, icon: '📧', desc: '' },
  phone:           { label: 'Phone Number', required: false, icon: '📱', desc: 'رقم تواصل Customer' },
  contact_person:  { label: 'Assigned To / الأكونت مانجر', required: false, icon: '🧑‍💼', desc: 'اسم موظف الـ Customer Service أو الـ Account Manager' },
  
  onboarding_date: { label: 'تاريخ بداية التعاقد', required: false, icon: '🤝', desc: 'تاريخ بدء علاقة Customer بالشركة' },
  meetings_30d:    { label: 'عدد الاجتماعات (30 يوم)', required: false, icon: '📞', desc: 'الاجتماعات في آخر شهر' },
  contact_days:    { label: 'عدد Contact Days', required: false, icon: '💬', desc: 'الأيام التي تواصل فيها Customer' },
  contract_type:   { label: 'نوع العقد', required: false, icon: '📜', desc: 'شهري / سنوي' },
  renewal_system:  { label: 'نظام التNew', required: false, icon: '⚙️', desc: 'تلقائي / يدوي' },
  roas:            { label: 'ROAS', required: false, icon: '📈', desc: 'نسبة العائد الإعلاني' },
  active_campaigns:{ label: 'Active Campaigns', required: false, icon: '🎯', desc: 'عدد الحملات الإعلانية الحالية' },
  performance_trend:{ label: 'Performance Trend', required: false, icon: '📉', desc: 'Improving / ثبات / Declining' },
  last_call_rating:{ label: 'Last Call Rating', required: false, icon: '⭐', desc: 'تقييم من 1 إلى 5' },
  last_contact_notes:{ label: 'Last Contact Notes', required: false, icon: '📝', desc: 'ملاحظة نصية حرّة للAnalyze' },
};

const SAMPLE_DATA = `customer_name,last_login,login_count_30d,feature_usage,support_tickets,monthly_revenue,renewal_date,payment_status,sector,plan,phone,contact_person,onboarding_date,meetings_30d,contact_days,contract_type,renewal_system,roas,active_campaigns,performance_trend,last_call_rating,last_contact_notes
أحمد محمود السيد,2024-11-01,2,20,3,500,2025-09-15,متأخر,أفراد,ذهبية,01012345678,سارة أحمد,2024-01-10,0,1,سنوي,يدوي,0,0,Declining,2,Customer غاضب جدا بسبب تأخر الخدمة
شركة النور للتجارة,2024-12-10,1,15,5,2000,2025-08-20,متأخر,شركات,بلاتينية,01098765432,محمد علي,2023-05-15,1,2,شهري,تلقائي,2.5,1,ثبات,3,يطلبون خصم اضافي لتNew الباقة
فاطمة حسن عبدالله,2025-01-15,20,85,0,300,2026-04-01,مدفوع,أفراد,فضية,01155556666,سارة أحمد,2025-01-01,4,5,سنوي,تلقائي,0,0,Improving,5,سعيدة جدا بالخدمات وسرعة الرد
مجموعة الرياض للاستثمار,2024-12-20,5,40,2,5000,2025-10-10,مدفوع,شركات,بلاتينية,01234567890,خالد إبراهيم,2022-10-20,3,10,سنوي,يدوي,4.0,3,Improving,4,يرغبون في التوسع واضافة خدمات Newة
محمد صلاح نجم,2024-11-15,1,10,4,150,2025-07-16,متعثر,أفراد,عادية,01187654321,محمد علي,2024-07-16,0,0,شهري,يدوي,0,0,Declining,1,لا يرد على المكالمات الهاتفية إطلاقا`;

export default function Upload() {
  const navigate = useNavigate();
  const { loadData, isAnalyzing, analyzeProgress = 0, customers } = useData();
  const [stage, setStage] = useState('upload'); // upload | mapping | analyzing
  const [dragOver, setDragOver] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState(null);
  const fileRef = useRef();

  const handleFile = useCallback(async (file) => {
    setError(null);
    try {
      const result = await parseFile(file);
      const autoMap = autoDetectColumns(result.columns);
      setFileInfo({ name: file.name, size: file.size, rowCount: result.rows.length, columns: result.columns });
      setParsedData(result);
      setMapping(autoMap);
      setStage('mapping');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!mapping.customer_name) {
      setError('يرجى تحديد عمود Customer Name على الأقل');
      return;
    }
    setStage('analyzing');
    try {
      await loadData(parsedData.rows, mapping, fileInfo.name);
      navigate('/');
    } catch (e) {
      console.error(e);
      setError(e.message || "حدث خطأ غير معروف");
      setStage('mapping'); // Go back to mapping stage to show error
    }
  };

  const downloadSample = () => {
    const blob = new Blob(['\uFEFF' + SAMPLE_DATA], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sample_customers.csv'; a.click();
  };
  if (stage === 'analyzing') {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', width: '100%', maxWidth: 400 }}>
          <div style={{ fontSize: 64, marginBottom: 24, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>الـ AI يحلل بياناتك</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>يتم Analyze Customers واستخراج التوصيات باستخدام Gemini...</div>
          
          <div style={{ width: '100%', height: 8, background: 'var(--bg-lighter)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ height: '100%', width: `${analyzeProgress}%`, background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
          </div>
          <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{analyzeProgress}% مكتمل</div>
          
          <div style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 13 }}>يتم Analyze {fileInfo?.rowCount?.toLocaleString('en-US')} customer(s)</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (stage === 'mapping') {
    const mappedCount = Object.keys(mapping).filter(k => mapping[k]).length;
    return (
      <div className="page-content">
        <div className="page-header">
          <div>
            <button className="back-btn" onClick={() => setStage('upload')}>
              <ArrowRight size={14} /> رجوع
            </button>
            <div className="page-title" style={{ marginTop: 8 }}>ربط الأعمدة</div>
            <div className="page-subtitle">حدد أي عمود في ملفك يتوافق مع كل حقل في النظام</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 16px', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>تم ربط </span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>{mappedCount}</span>
              <span style={{ color: 'var(--text-muted)' }}> / {Object.keys(FIELD_LABELS).length} حقل</span>
            </div>
            <button className="btn btn-primary" style={{ fontSize: 15, padding: '10px 24px' }} onClick={handleAnalyze}>
              <span>⚡</span> بدء Analyze الـ AI — {fileInfo.rowCount.toLocaleString('en-US')} customer(s)
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16, color: 'var(--danger)', fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* File info banner */}
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px' }}>
          <FileSpreadsheet size={28} style={{ color: 'var(--success)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{fileInfo.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
              {fileInfo.rowCount.toLocaleString('en-US')} customer(s) · {fileInfo.columns.length} عمود · {(fileInfo.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <CheckCircle size={20} style={{ color: 'var(--success)' }} />
        </div>

        {/* Column mapping grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {Object.entries(FIELD_LABELS).map(([field, meta]) => (
            <div key={field} className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, border: mapping[field] ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{meta.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                  {meta.required && <span style={{ color: '#EF4444', fontSize: 11 }}>*مطلوب</span>}
                </div>
                {mapping[field] && <CheckCircle size={14} style={{ color: 'var(--success)' }} />}
              </div>
              {meta.desc && <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{meta.desc}</div>}
              <select
                className="filter-select"
                style={{ background: 'var(--bg-secondary)', width: '100%', padding: '6px 10px', fontSize: 12 }}
                value={mapping[field] || ''}
                onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || undefined }))}
              >
                <option value="">— غير مربوط —</option>
                {fileInfo.columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Upload stage
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - var(--header-height) - 40px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 480 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>📊</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>ابدأ بAnalyze عملائك</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>
          ارفع ملف CSV أو Excel يحتوي على بيانات عملائك وسيقوم الـ AI بAnalyze سلوك كل customer(s) واكتشاف من هو At Risk.
        </div>
        
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        
        <button className="btn btn-primary" style={{ fontSize: 15, padding: '12px 28px', margin: '0 auto' }} onClick={() => fileRef.current.click()}>
          <UploadIcon size={16} /> ارفع بيانات Customers الآن
        </button>
        
        <div style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 12 }}>
          يدعم CSV وExcel — حتى 100,000 customer(s)
        </div>

        {error && (
          <div style={{ marginTop: 24, background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center', color: 'var(--danger)', fontSize: 13, fontWeight: 600, justifyContent: 'center' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
