// Groq API Service — استخدام Groq للAnalyze الجماعي والفردي للعملاء
// الأولوية: Groq أسرع بكثير من Gemini للAnalyze الجماعي

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'qwen/qwen3.8-27b'; // الموديل المتاح والفعال للتحليل الدقيق والموثوق

function getGroqKey() {
  return import.meta.env.VITE_GROQ_API_KEY;
}

async function callGroq(prompt) {
  const key = getGroqKey();
  if (!key) throw new Error('مفتاح Groq غير موجود في .env');

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API Error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// Analyze دفعة عملاء (Batch) — يُستخدم عند رفع الداتا
export async function groqAnalyzeCustomerBatch(customersBatch) {
  const batchData = customersBatch.map(c => `
    [ID: ${c.id}]
    - الاسم: ${c.name}
    - Sector: ${c.sector}
    - Plan: ${c.plan}
    - الإيراد: ${c.revenue}
    - حالة الدفع: ${c.paymentStatus}
    - Account Status (يدوية): ${c.status || 'New'}
    - أيام منذ آخر دخول: ${c.lastActivityDays}
    - التذاكر/الشكاوى: ${c.rawMetrics?.tickets || 0}
    - تاريخ التعاقد: ${c.rawMetrics?.onboardingDate || 'N/A'}
    - الاجتماعات آخر 30 يوم: ${c.rawMetrics?.meetings30d || 0}
    - Contact Days: ${c.rawMetrics?.contactDays || 0}
    - نوع العقد: ${c.rawMetrics?.contractType || 'N/A'}
    - نظام التNew: ${c.rawMetrics?.renewalSystem || 'N/A'}
    - العائد ROAS: ${c.rawMetrics?.roas || 0}
    - Active Campaigns: ${c.rawMetrics?.activeCampaigns || 0}
    - Performance Trend: ${c.rawMetrics?.performanceTrend || 'N/A'}
    - تقييم المكالمة: ${c.rawMetrics?.lastCallRating || 0} / 5
    - ملاحظات: ${c.rawMetrics?.lastContactNotes || 'N/A'}
    - Assigned To: ${c.contactPerson || 'N/A'}
  `).join('\n\n');

  const prompt = `
أنت خبير متقدم واستراتيجي في تحليل نجاح العملاء (Senior Customer Success Manager & Predictive Churn Analyst) بوكالة تسويق رقمي في السعودية.
مهمتك الأساسية هي التنبؤ الاستباقي بالعملاء المعرضين لخطر المغادرة (Churn Prediction) وتحديد الأسباب الجذرية بدقة.

كيفية التنبؤ وتحديد الخطر (قواعد التحليل):
1. جودة الأداء (ROAS والحملات): إذا كان العائد على الاستثمار 0 أو الحملات غير نشطة، فهذا مؤشر خطر حرج للغاية (العميل لا يستفيد ولن يجدد).
2. قلة التفاعل: انقطاع العميل عن تسجيل الدخول أو غياب الاجتماعات يدل على فقدان الاهتمام الفعلي (Disengagement).
3. الدعم الفني والمشاعر: التذاكر الكثيرة أو الملاحظات السلبية تعكس استياءً قوياً وتتطلب تدخلاً عاجلاً.
4. الدفع: التأخير في الدفع متزامناً مع مؤشرات سلبية أخرى يعني أن العميل على وشك الإلغاء.
5. Account Status اليدوية: وضع "Resolved" يخفض الخطر، "Follow-up" يرفعه.

تعليمات صارمة للدقة (High Accuracy & No Hallucinations):
- التوصيات يجب أن تكون عملية، دقيقة جداً، ومبنية فقط على المشاكل الظاهرة في الأرقام.
- يمنع منعاً باتاً افتراض معلومات غير موجودة أو تقديم توصيات عشوائية. إذا كانت الأرقام جيدة، قدم توصيات للنمو (Upsell) بدلاً من حل مشاكل غير موجودة.

بيانات Customers:
${batchData}

المطلوب: قم بإرجاع JSON Array فقط بدون أي نصوص إضافية، بالصيغة:
[
  {
    "id": "نفس المعرف",
    "riskScore": (رقم 0-100),
    "riskLevel": ("high" أو "medium" أو "low"),
    "aiInsights": [
      {"type": "danger" أو "warning" أو "info" أو "success", "text": "استنتاج دقيق بناءً على البيانات"}
    ],
    "recommendations": [
      {"icon": "🚨", "title": "إجراء مقترح", "desc": "ما الذي يجب على الموظف فعله", "priority": "حرجة" أو "Highة" أو "Mediumة" أو "Lowة"}
    ]
  }
]`;

  const text = await callGroq(prompt);
  let jsonStr = text.trim();
  // استخراج JSON من الرد
  const start = jsonStr.indexOf('[');
  const end = jsonStr.lastIndexOf(']') + 1;
  if (start === -1 || end === 0) throw new Error('Groq: لم يتم إرجاع JSON صحيح');
  jsonStr = jsonStr.slice(start, end);
  const parsed = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) throw new Error('Groq: المخرجات ليست array');
  return parsed;
}

// Analyze customer(s) فردي بعمق — يُستخدم في صفحة تفاصيل Customer
export async function groqAnalyzeCustomerData(customer) {
  const prompt = `
## الدور والخبرة المطلوبة
أنت خبير استراتيجي في نجاح العملاء ومحلل تنبؤي (Predictive Churn Analyst & Senior CSM) متخصص في وكالات التسويق الرقمي في السعودية.
لديك قدرة فائقة على ربط البيانات المتباعدة لاكتشاف العملاء المعرضين لخطر الإلغاء (Churn Risk) قبل حدوثه، وتقديم خطط إنقاذ أو خطط نمو فعالة.

## القواعد التحليلية (كيف تتنبأ بالخطر):
- اربط بين العائد (ROAS) والحملات (Active Campaigns): إذا كان العائد ضعيفاً أو الحملات متوقفة، العميل يضيع ماله ولن يجدد اشتراكه!
- راقب التواصل (Contact Days) والاجتماعات: العميل الذي لا يحضر اجتماعات هو عميل بدأ في الانسحاب وفقدان الاهتمام.
- حالة الدفع (Payment Status): الدفع المتأخر غالباً يعكس عدم الرضا عن أداء الخدمة وليس فقط مشكلة مالية.
- مشاعر العميل (Sentiment): ركز جداً في الملاحظات (Notes) وتقييم المكالمات، الكلمات السلبية تعادل إنذاراً أحمر.

## تعليمات صارمة للدقة والموثوقية:
1. التنبؤ المبني على الأدلة: لا تتوقع الخطر بناءً على التخمين، استنتج المخاطر بناءً على الأرقام الحقيقية وضعف الأداء الواضح.
2. خطط إنقاذ حقيقية (Actionable Rescue Plans): التوصيات يجب أن تكون خطوات إنقاذ محددة وعملية للموظف (مثال: "عقد اجتماع طارئ لمناقشة أسباب توقف الحملات")، لا تقدم نصائح عامة مبهمة.
3. تجنب التوصيات الخاطئة (Zero Hallucination): لا تخترع مشاكل إذا لم تكن موجودة. إذا كانت أرقام العميل ممتازة، اجعل التوصيات موجهة نحو "الترقية" (Upsell) وتعزيز العلاقة.

## بيانات Customer:
- الاسم: ${customer.name}
- Sector: ${customer.sector}
- Plan: ${customer.plan}
- Monthly Revenue: ${customer.revenue} SAR
- حالة الدفع: ${customer.paymentStatus}
- Account Status (يدوية): ${customer.status || 'New'}
- عدد التذاكر / الشكاوى: ${customer.rawMetrics?.tickets || 0}
- تاريخ التعاقد: ${customer.rawMetrics?.onboardingDate || 'N/A'}
- الاجتماعات آخر 30 يوم: ${customer.rawMetrics?.meetings30d || 0}
- Contact Days: ${customer.rawMetrics?.contactDays || 0}
- نوع العقد: ${customer.rawMetrics?.contractType || 'N/A'}
- نظام التNew: ${customer.rawMetrics?.renewalSystem || 'N/A'}
- العائد ROAS: ${customer.rawMetrics?.roas || 0}
- Active Campaigns: ${customer.rawMetrics?.activeCampaigns || 0}
- Performance Trend: ${customer.rawMetrics?.performanceTrend || 'N/A'}
- تقييم المكالمة: ${customer.rawMetrics?.lastCallRating || 0} / 5
- ملاحظات: ${customer.rawMetrics?.lastContactNotes || 'N/A'}
- Assigned To: ${customer.contactPerson || 'N/A'}

## المطلوب:
إرجاع كائن JSON واحد فقط بدون أي نصوص إضافية:
{
  "client_name": "string",
  "analysis_date": "YYYY-MM-DD",
  "assigned_manager": "string | null",
  "overall_risk_score": (integer 0-100),
  "risk_level": "أحمر | أصفر | أخضر",
  "risk_trend_vs_context": "string",
  "confidence_level": "Highة | Mediumة | Lowة",
  "data_completeness_pct": (integer 0-100),
  "missing_fields": ["array"],
  "category_scores": {
    "engagement": (integer 0-100 | null),
    "financial_contract_risk": (integer 0-100 | null),
    "performance_delivered": (integer 0-100 | null),
    "satisfaction_support": (integer 0-100 | null)
  },
  "key_risk_drivers": ["2-4 strings مرتبة بالأهمية"],
  "key_positive_signals": ["0-3 strings"],
  "sentiment_from_notes": "إيجابية | محايدة | سلبية | تحذيرية | غير متاح",
  "sentiment_keywords": ["array"],
  "renewal_window_days": (integer | null),
  "renewal_urgency": "عاجل | قريب | بعيد | غير محدد",
  "upsell_opportunity": true أو false,
  "upsell_reasoning": "string | null",
  "revenue_at_risk_sar": (number),
  "recommended_actions": [
    {"action": "string", "priority": "Highة | Mediumة | Lowة", "due_within_days": (integer)}
  ],
  "priority_this_week": "Highة | Mediumة | Lowة",
  "priority_rank_reason": "string"
}`;

  const text = await callGroq(prompt);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}') + 1;
  if (start === -1 || end === 0) throw new Error('Groq: لم يتم إرجاع JSON صحيح');
  return JSON.parse(text.slice(start, end));
}

export function isGroqAvailable() {
  return !!import.meta.env.VITE_GROQ_API_KEY;
}
