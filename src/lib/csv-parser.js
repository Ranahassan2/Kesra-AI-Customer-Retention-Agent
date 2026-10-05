import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parse a CSV or Excel file and return array of row objects
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'csv') return parseCSV(file);
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
  throw new Error(`صيغة الملف غير مدعومة: .${ext} — يرجى استخدام CSV أو Excel`);
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error('خطأ في قراءة ملف CSV: ' + results.errors[0].message));
        } else {
          resolve({ rows: results.data, columns: results.meta.fields || [] });
        }
      },
      error: (err) => reject(new Error('فشل في قراءة الملف: ' + err.message)),
    });
  });
}

function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        resolve({ rows, columns });
      } catch (err) {
        reject(new Error('فشل في قراءة ملف Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Smart column auto-detector
 * Tries to guess which CSV column maps to each required system field
 */
export function autoDetectColumns(columns) {
  const lower = columns.map(c => c.toLowerCase().trim());
  const mapping = {};

  const matchers = {
    customer_name: [
      'customer_name', 'name', 'company', 'client', 'customer', 'full_name',
      'اسم', 'customer(s)', 'شركة', 'Customer Name', 'اسم الشركة', 'الاسم', 'اسم الزبون',
      'الاسم الكامل', 'Customer',
    ],
    last_login: [
      'last_login', 'last_login_date', 'last_active', 'last_activity', 'last_visit',
      'last_contact', 'last_seen', 'lastlogin',
      'آخر دخول', 'آخر نشاط', 'آخر زيارة', 'تاريخ آخر دخول', 'تاريخ آخر زيارة',
      'آخر تواصل', 'آخر اتصال', 'تاريخ الزيارة',
    ],
    login_count_30d: [
      'login_count', 'logins', 'sessions', 'visits', 'visit_count',
      'login_30d', 'login_count_30d', 'visits_30d', 'contacts_30d',
      'عدد الدخول', 'الجلسات', 'عدد الزيارات', 'زيارات', 'عدد التواصل',
      'عدد المرات', 'تكرار الزيارة',
    ],
    support_tickets: [
      'support_tickets', 'tickets', 'complaints', 'issues', 'support',
      'problems', 'cases',
      'شكاوى', 'تذاكر', 'طلبات دعم', 'مشاكل', 'عدد الشكاوى',
      'شكاوى Customer', 'المشاكل',
    ],
    monthly_revenue: [
      'revenue', 'monthly_revenue', 'mrr', 'arr', 'amount', 'value',
      'total_paid', 'fees',
      'الإيراد', 'الدخل', 'العائد', 'المبلغ', 'قيمة الخدمة',
      'الرسوم', 'إجمالي المدفوع', 'قيمة الاشتراك',
    ],
    renewal_date: [
      'renewal_date', 'renew', 'contract_end', 'expiry', 'expire', 'end_date',
      'subscription_end',
      'تNew', 'Renewal Date', 'انتهاء العقد', 'تاريخ الانتهاء',
      'انتهاء الخدمة', 'تاريخ انتهاء الخدمة',
    ],
    payment_status: [
      'payment_status', 'payment', 'paid', 'billing', 'invoice_status',
      'الدفع', 'حالة الدفع', 'وضع الدفع', 'الفاتورة',
    ],
    sector: [
      'sector', 'industry', 'segment', 'category', 'type', 'client_type',
      'Sector', 'الصناعة', 'الفئة', 'نوع Customer', 'تصنيف Customer',
      'التصنيف', 'الشريحة',
    ],
    plan: [
      'plan', 'tier', 'package', 'subscription', 'service_type',
      'Plan', 'الباقة', 'الاشتراك', 'نوع الخدمة', 'نوع الباقة',
      'الخدمة', 'المنتج',
    ],
    email: ['email', 'mail', 'e_mail', 'البريد', 'الإيميل', 'البريد الإلكتروني'],
    phone: [
      'phone', 'mobile', 'tel', 'telephone', 'cell',
      'الهاتف', 'الجوال', 'Phone Number', 'رقم الجوال', 'موبايل',
    ],
    contact_person: [
      'contact', 'contact_name', 'person', 'representative', 'agent',
      'employee', 'assigned_to', 'handler', 'account_manager', 'manager',
      'جهة الاتصال', 'المسؤول', 'الموظف', 'Assigned To',
      'المندوب', 'مسؤول الخدمة', 'اكونت مانجر'
    ],
    onboarding_date: [
      'onboarding', 'onboard', 'start_date', 'join_date', 'created_at',
      'تاريخ التعاقد', 'بداية التعاقد', 'تاريخ الانضمام', 'تاريخ البدء', 'التعاقد'
    ],
    meetings_30d: [
      'meetings', 'calls', 'meetings_30d', 'calls_30d',
      'اجتماعات', 'مكالمات', 'عدد الاجتماعات', 'عدد المكالمات'
    ],
    contact_days: [
      'contact_days', 'days_contacted', 'engagement_days',
      'Contact Days', 'ايام التواصل', 'عدد Contact Days'
    ],
    contract_type: [
      'contract_type', 'contract', 'agreement_type',
      'نوع العقد', 'العقد', 'طبيعة العقد'
    ],
    renewal_system: [
      'renewal_system', 'auto_renew', 'renewal_type',
      'نظام التNew', 'نوع التNew', 'تNew تلقائي'
    ],
    roas: [
      'roas', 'return_on_ad_spend', 'ad_return',
      'العائد', 'عائد الإعلانات', 'نسبة العائد', 'roas'
    ],
    active_campaigns: [
      'active_campaigns', 'campaigns', 'ads_running',
      'Active Campaigns', 'عدد الحملات', 'حملات', 'الحملات'
    ],
    performance_trend: [
      'performance_trend', 'trend', 'performance',
      'Performance Trend', 'الاداء', 'الأداء', 'مسار الأداء'
    ],
    last_call_rating: [
      'last_call_rating', 'rating', 'score', 'feedback_score',
      'Last Call Rating', 'التقييم', 'تقييم', 'درجة الرضا'
    ],
    last_contact_notes: [
      'last_contact_notes', 'notes', 'comments', 'feedback', 'remark',
      'Last Contact Notes', 'ملاحظات', 'ملاحظة', 'تعليقات', 'رأي Customer'
    ],
  };

  for (const [field, keywords] of Object.entries(matchers)) {
    for (let i = 0; i < lower.length; i++) {
      if (keywords.some(kw => lower[i].includes(kw.toLowerCase()))) {
        mapping[field] = columns[i];
        break;
      }
    }
  }

  return mapping;
}

/**
 * Normalize raw date string to days-since-last-login (0 = today)
 */
export function parseDaysSince(dateStr) {
  if (!dateStr) return 30;
  const d = new Date(dateStr);
  if (isNaN(d)) return 30;
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function parseNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace(/[^0-9.]/g, '');
  return parseFloat(str) || 0;
}

export function parsePercent(val) {
  if (val === null || val === undefined || val === '') return 0;
  const str = String(val).replace('%', '').trim();
  return Math.min(100, Math.max(0, parseFloat(str) || 0));
}
