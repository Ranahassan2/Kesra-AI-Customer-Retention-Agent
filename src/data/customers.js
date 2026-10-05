// AI Customer Retention Agent - Mock Data Generator

const sectors = ['تقنية', 'تجارة إلكترونية', 'صحة', 'مالية', 'تعليم', 'لوجستيات', 'إعلام', 'اتصالات', 'خدمات', 'صناعة'];
const plans = ['مؤسسي', 'احترافي', 'متقدم', 'أساسي'];
const statusLabels = { high: 'High', medium: 'Medium', low: 'Low' };

const companyNames = [
  'شركة النيل للبرمجيات', 'سوبر ماركت الرضواني', 'شركة صروح كابيتال',
  'مستشفيات كابيوارا', 'أراماكس مصر للشحن', 'فوزي للمفروشات',
  'مؤسسة الأهرام', 'مصنع النصر للسيارات', 'مدارس طيبة الدولية',
  'جوميا مصر', 'بنك القاهرة', 'شركة أوSARكوم', 'مجموعة طلعت مصطفى',
  'نساجون الشرق', 'إيديتا للصناعات الغذائية', 'مصر للطيران',
  'شركة موبايلي', 'العربي للإلكترونيات', 'مجموعة MG للسيارات',
  'صيدليات الدواء', 'شركة رايا القابضة', 'الشركة المتحدة للخدمات الإعلامية',
  'بنك مصر', 'شركة فودافون مصر', 'شركة اتصالات مصر',
  'مجموعة سامي ساويرس', 'شركة بايونيرز القابضة', 'الشركة الدولية للاتصالات',
  'مجموعة ماجد الفطيم', 'شركة دبي للتأمين',
  'مجموعة البنك الأهلي', 'شركة كونتيكس للمقاولات',
  'مجموعة سوديك العقارية', 'شركة الإسماعيلية مصر القابضة',
  'مؤسسة النور للتعليم', 'شركة ألترا باور للطاقة',
  'مجموعة الساعي التجارية', 'شركة ميدل إيست للخدمات اللوجستية',
  'مؤسسة القمة الطبية', 'مجموعة شلبي الطبية القابضة',
];

function generateHealthData(seed) {
  const r = (min, max) => Math.floor(Math.abs(Math.sin(seed * 9301 + seed * 49297)) * (max - min + 1)) + min;
  const usage = r(5, 100);
  const support = r(5, 100);
  const engagement = r(5, 100);
  const payment = r(20, 100);
  const score = Math.round(usage * 0.4 + support * 0.25 + engagement * 0.20 + payment * 0.15);
  return { usage, support, engagement, payment, score };
}

function getRiskLevel(score) {
  if (score < 40) return 'high';
  if (score < 70) return 'medium';
  return 'low';
}

function getChurnProbability(score) {
  if (score < 20) return Math.floor(85 + Math.random() * 14);
  if (score < 40) return Math.floor(60 + Math.random() * 24);
  if (score < 60) return Math.floor(30 + Math.random() * 29);
  if (score < 80) return Math.floor(10 + Math.random() * 19);
  return Math.floor(2 + Math.random() * 8);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function randomDate(monthsAhead) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().split('T')[0];
}

function generateSupportTickets(count, seed) {
  const issues = ['مشكلة في تسجيل الدخول', 'خطأ في الفاتورة', 'طلب استرداد', 'مشكلة أداء', 'طلب تدريب', 'خلل في Reports', 'مشكلة في الدفع', 'طلب ميزة Newة'];
  const statuses = ['Resolved', 'مفتوح', 'قيد المعالجة'];
  const tickets = [];
  for (let i = 0; i < count; i++) {
    const s = (seed * (i + 1)) % issues.length;
    tickets.push({
      id: `TKT-${1000 + seed * 10 + i}`,
      issue: issues[s],
      date: daysAgo(Math.floor(Math.random() * 60)),
      status: statuses[i % statuses.length],
      priority: i === 0 ? 'Highة' : 'Mediumة',
    });
  }
  return tickets;
}

function generateUsageData(score) {
  const base = score;
  return Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    logins: Math.max(0, Math.floor(base / 20 + Math.sin(i * 0.5) * 3 + Math.random() * 2)),
    features: Math.max(0, Math.floor(base / 30 + Math.cos(i * 0.4) * 2 + Math.random() * 2)),
  }));
}

function getAIInsights(customer) {
  const insights = [];
  if (customer.health.usage < 40) insights.push({ type: 'warning', text: `انخفاض حاد في الاستخدام بنسبة ${100 - customer.health.usage}% خلال آخر 30 يوم` });
  if (customer.health.support < 40) insights.push({ type: 'danger', text: `معدل رضا الدعم Low جداً — ${customer.supportTickets.length} شكاوى غير محلولة` });
  if (customer.health.engagement < 50) insights.push({ type: 'warning', text: `انخفاض التفاعل — آخر نشاط كان منذ ${customer.lastActivity}` });
  if (customer.health.payment < 60) insights.push({ type: 'danger', text: `تأخر في الدفع — حالة الدفع: ${customer.paymentStatus}` });
  if (customer.renewalDate && new Date(customer.renewalDate) < new Date(Date.now() + 30 * 24 * 3600 * 1000)) insights.push({ type: 'info', text: `موعد التNew خلال 30 يوم — يحتاج Follow-up عاجلة` });
  if (insights.length === 0) insights.push({ type: 'success', text: 'Customer في وضع صحي جيد، استمر في الFollow-up الدورية' });
  return insights;
}

function getRecommendations(score, sector) {
  const recs = [];
  if (score < 30) {
    recs.push({ icon: '🚨', title: 'تدخل فوري مطلوب', desc: 'تواصل مع Customer خلال 24 ساعة لمناقشة مخاوفه', priority: 'حرجة' });
    recs.push({ icon: '💬', title: 'جلسة مراجعة شاملة', desc: 'رتب اجتماعاً مع فريق Customer Success لمراجعة تجربة Customer', priority: 'Highة' });
  } else if (score < 50) {
    recs.push({ icon: '📞', title: 'مكالمة Follow-up', desc: 'تواصل أسبوعي لضمان رضا Customer وحل المشاكل', priority: 'Highة' });
    recs.push({ icon: '🎓', title: 'جلسة تدريب مجانية', desc: 'قدم تدريباً مجانياً على الميزات الNewة', priority: 'Mediumة' });
  } else if (score < 70) {
    recs.push({ icon: '📊', title: 'تقرير قيمة دورية', desc: 'أرسل تقرير شهري يوضح الفائدة من المنتج', priority: 'Mediumة' });
    recs.push({ icon: '🎁', title: 'عرض ترقية مخصص', desc: `عرض خاص يناسب قطاع ${sector}`, priority: 'Lowة' });
  } else {
    recs.push({ icon: '⭐', title: 'برنامج ولاء', desc: 'ادعو Customer لبرنامج الشركاء المميزين', priority: 'Lowة' });
    recs.push({ icon: '📣', title: 'طلب توصية', desc: 'اطلب من Customer مراجعة أو توصية', priority: 'Lowة' });
  }
  return recs;
}

function generateCustomers(count = 200) {
  const customers = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    const seed = i + 1;
    const nameIdx = i % companyNames.length;
    let name = companyNames[nameIdx];
    if (usedNames.has(name)) name = name + ` ${Math.floor(i / companyNames.length) + 1}`;
    usedNames.add(name);

    const health = generateHealthData(seed);
    const riskLevel = getRiskLevel(health.score);
    const sector = sectors[i % sectors.length];
    const plan = plans[i % plans.length];
    const revenue = [150, 250, 300, 600, 900, 1200, 1800, 2500, 4000, 10000][i % 10];
    const lastDays = riskLevel === 'high' ? Math.floor(Math.random() * 30 + 5) : riskLevel === 'medium' ? Math.floor(Math.random() * 14 + 1) : Math.floor(Math.random() * 7);
    const ticketCount = riskLevel === 'high' ? Math.floor(Math.random() * 8 + 3) : riskLevel === 'medium' ? Math.floor(Math.random() * 5 + 1) : Math.floor(Math.random() * 3);
    const churnProb = getChurnProbability(health.score);
    const paymentStatuses = ['مدفوع', 'متأخر', 'مدفوع', 'مدفوع', 'متأخر'];
    const paymentStatus = riskLevel === 'high' ? 'متأخر' : paymentStatuses[i % 5];

    const initials = name.split(' ').filter(w => w.length > 2).map(w => w[0]).slice(0, 2).join('');
    const colors = ['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2', '#BE185D', '#65A30D'];
    const color = colors[i % colors.length];

    const renewalMonths = riskLevel === 'high' ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 12) + 1;
    const customer = {
      id: `CUST-${String(seed).padStart(4, '0')}`,
      name,
      initials,
      color,
      sector,
      plan,
      revenue,
      health,
      riskLevel,
      churnProbability: churnProb,
      lastActivity: lastDays === 0 ? 'اليوم' : lastDays === 1 ? 'أمس' : `منذ ${lastDays} أيام`,
      lastActivityDays: lastDays,
      renewalDate: randomDate(renewalMonths),
      paymentStatus,
      supportTickets: generateSupportTickets(ticketCount, seed),
      usageData: generateUsageData(health.score),
      joinDate: daysAgo(Math.floor(Math.random() * 730 + 30)),
      contactPerson: ['أحمد محمد', 'سارة أحمد', 'محمد علي', 'فاطمة حسن', 'عمر خالد', 'نور الدين', 'مريم سمير', 'كريم عبدالله'][i % 8],
      contactEmail: `contact@${name.replace(/\s+/g, '').toLowerCase()}.com`,
      contactPhone: `+20 ${100 + (i % 900)} ${Math.floor(Math.random() * 9000000 + 1000000)}`,
    };
    customer.aiInsights = getAIInsights(customer);
    customer.recommendations = getRecommendations(health.score, sector);
    customers.push(customer);
  }
  return customers;
}

export const customersData = generateCustomers(200);
export const totalCustomers = 1842;

export const dashboardStats = {
  totalCustomers: 1842,
  avgHealthScore: Math.round(customersData.reduce((a, c) => a + c.health.score, 0) / customersData.length),
  highRiskCount: customersData.filter(c => c.riskLevel === 'high').length,
  mediumRiskCount: customersData.filter(c => c.riskLevel === 'medium').length,
  lowRiskCount: customersData.filter(c => c.riskLevel === 'low').length,
  retentionRate: 78,
  retentionChange: 5.1,
  healthChange: -3.2,
  totalChange: 12.5,
  riskChange: 8.7,
};

export const sectorRiskData = [
  { sector: 'تقنية', high: 4, medium: 3, low: 1 },
  { sector: 'اتصالات', high: 3, medium: 2, low: 2 },
  { sector: 'مالية', high: 2, medium: 4, low: 3 },
  { sector: 'لوجستيات', high: 2, medium: 3, low: 2 },
  { sector: 'صحة', high: 1, medium: 2, low: 4 },
  { sector: 'تعليم', high: 1, medium: 3, low: 2 },
  { sector: 'إعلام', high: 3, medium: 2, low: 1 },
  { sector: 'تجارة إلكترونية', high: 2, medium: 1, low: 3 },
  { sector: 'خدمات', high: 1, medium: 2, low: 3 },
  { sector: 'أخرى', high: 1, medium: 1, low: 2 },
];

export const alertsData = customersData
  .filter(c => c.riskLevel === 'high' || c.riskLevel === 'medium')
  .slice(0, 36)
  .map((c, i) => ({
    id: `ALT-${1000 + i}`,
    customer: c,
    reason: c.health.usage < 40 ? 'انخفاض استخدام المنصة' :
            c.health.support < 40 ? 'زيادة الشكاوى والدعم' :
            c.health.payment < 60 ? 'تأخر في سداد الفاتورة' :
            c.renewalDate && new Date(c.renewalDate) < new Date(Date.now() + 30 * 24 * 3600 * 1000) ? 'اقتراب موعد التNew' :
            'انخفاض معدل الدخول',
    severity: c.riskLevel === 'high' ? 'حرج' : 'Medium',
    status: i % 3 === 0 ? 'New' : i % 3 === 1 ? 'قيد الFollow-up' : 'Resolved',
    date: new Date(Date.now() - i * 3600000 * 12).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }),
    time: `${String(Math.floor(Math.random() * 12) + 8).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} ص`,
  }));
