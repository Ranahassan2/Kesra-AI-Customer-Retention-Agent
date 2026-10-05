import { Bell, Upload } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../store/dataStore';

const routeTitles = {
  '/':          { title: 'مرحبًا بك في ريتيشن', sub: 'ذكاء يحافظ على عملائك، ويقلل من فقدانهم' },
  '/customers': { title: 'Customers', sub: 'إدارة وFollow-up جميع Customers' },
  '/alerts':    { title: 'Risk Alerts', sub: 'Follow-up التنبيهات الحرجة والفرص التي تحتاج تدخل سريع' },
  '/reports':   { title: 'Reports', sub: 'Analyzeات وتقارير أداء الاحتفاظ بCustomers' },
  '/upload':    { title: 'رفع بيانات Customers', sub: 'ارفع CSV أو Excel وسيحللها الـ AI فوراً' },
  '/export':    { title: 'رفع بيانات Customers', sub: 'ارفع CSV أو Excel وسيحللها الـ AI فوراً' },
  '/settings':  { title: 'Settings', sub: 'إعدادات النظام والتخصيصات' },
};

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { stats, isLive, liveAlerts } = useData();
  const alertCount = (stats?.high || 0);

  const path = location.pathname.startsWith('/customers/') ? '/customers' : location.pathname;
  const info = routeTitles[path] || routeTitles['/'];

  return (
    <header className="header">
      <div>
        <div className="header-title">{info.title}</div>
        <div className="header-sub">{info.sub}</div>
      </div>
      <div className="header-right">
        {isLive && (
          <div className="status-badge" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)' }}>
            <div className="status-dot"></div>
            Live يعمل
          </div>
        )}
        {!isLive && (
          <div className="status-badge">
            <div className="status-dot"></div>
            System Online
          </div>
        )}
        <button className="header-btn" onClick={() => navigate('/alerts')} title="التنبيهات" style={{ position: 'relative' }}>
          <Bell size={16} />
          {alertCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: '#EF4444', color: 'white', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
