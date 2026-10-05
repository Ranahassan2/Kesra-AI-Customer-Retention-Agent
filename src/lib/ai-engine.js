import { parseDaysSince, parseNumber } from './csv-parser';

const COLORS = [
  '#2563EB','#7C3AED','#059669','#DC2626','#D97706',
  '#0891B2','#BE185D','#65A30D','#9333EA','#0284C7',
  '#EA580C','#16A34A','#D946EF','#0D9488','#B45309',
];

/**
 * Main AI Engine — analyzes one customer row and returns enriched customer object
 */
export function analyzeCustomer(rawRow, columnMapping, index) {
  const get = (field) => rawRow[columnMapping[field]] ?? '';

  // ─── Extract Raw Values ───────────────────────────────────────────────────
  const name         = String(get('customer_name') || `customer(s) ${index + 1}`).trim();
  const lastLoginStr = get('last_login');
  const loginCount   = parseNumber(get('login_count_30d'));

  const tickets      = parseNumber(get('support_tickets'));
  const revenue      = parseNumber(get('monthly_revenue'));
  const renewalStr   = get('renewal_date');
  const paymentRaw   = String(get('payment_status') || '').trim();
  const sector       = String(get('sector') || 'غير محدد').trim();
  const plan         = String(get('plan') || 'غير محدد').trim();
  const email        = String(get('email') || '').trim();
  const phone        = String(get('phone') || '').trim();
  const contactPerson= String(get('contact_person') || '').trim();

  // New fields
  const onboardingStr= String(get('onboarding_date') || '').trim();
  const meetings     = parseNumber(get('meetings_30d'));
  const contactDays  = parseNumber(get('contact_days'));
  const contractType = String(get('contract_type') || '').trim();
  const renewalSys   = String(get('renewal_system') || '').trim();
  const roas         = parseNumber(get('roas'));
  const activeCamp   = parseNumber(get('active_campaigns'));
  const trend        = String(get('performance_trend') || '').trim();
  const callRating   = parseNumber(get('last_call_rating'));
  const contactNotes = String(get('last_contact_notes') || '').trim();

  // ─── Derived Metrics ──────────────────────────────────────────────────────
  const daysSinceLogin = lastLoginStr ? parseDaysSince(lastLoginStr) : (loginCount > 0 ? 5 : 30);

  // Renewal risk (days until renewal)
  let daysToRenewal = 365;
  if (renewalStr) {
    const renDate = new Date(renewalStr);
    if (!isNaN(renDate)) daysToRenewal = Math.floor((renDate - Date.now()) / (1000 * 60 * 60 * 24));
  }

  // Payment: detect Arabic/English terms
  const isPaid    = /مدفوع|paid|ok|active|نشط/i.test(paymentRaw);
  const isLate    = /متأخر|late|overdue|unpaid|غير مدفوع|pending/i.test(paymentRaw);
  const isRefused = /مرفوض|refused|failed|فشل/i.test(paymentRaw);
  let paymentStatus = 'مدفوع';
  if (isLate)    paymentStatus = 'متأخر';
  if (isRefused) paymentStatus = 'مرفوض';

  // ─── Scoring ──────────────────────────────────────────────────────────────

  // Usage Score (40%): days since login + login frequency + feature usage
  let usageScore = 100;
  if (daysSinceLogin > 0) {
    usageScore -= Math.min(60, daysSinceLogin * 2);           // penalize inactivity
  }
  if (loginCount !== undefined && loginCount < 10) {
    usageScore -= Math.min(20, (10 - Math.min(loginCount, 10)) * 2);
  }

  usageScore = Math.max(0, Math.min(100, Math.round(usageScore)));

  // Support Score (25%): tickets drop score (strong risk indicator)
  let supportScore = 100;
  if (tickets > 0) {
    supportScore -= Math.min(80, tickets * 15);
  }
  // Optional: Trend modifier
  if (trend === 'Declining' || trend.toLowerCase() === 'declining') supportScore -= 10;
  if (trend === 'Improving' || trend.toLowerCase() === 'improving') supportScore += 10;
  if (callRating > 0 && callRating <= 2) supportScore -= 20;

  supportScore = Math.max(0, Math.min(100, Math.round(supportScore)));

  // Payment Score (20%)
  let paymentScore = isPaid ? 85 : isLate ? 35 : isRefused ? 10 : 70;
  // Boost/reduce based on renewal proximity
  if (daysToRenewal < 0)   paymentScore = Math.min(paymentScore, 40);   // overdue
  if (daysToRenewal < 30)  paymentScore = Math.min(paymentScore, 65);   // urgent
  paymentScore = Math.max(0, Math.min(100, paymentScore));

  // Revenue Score (15%): just signal non-zero
  const revenueScore = revenue > 0 ? Math.min(100, 50 + Math.log10(revenue + 1) * 10) : 30;

  // Weighted Total
  const healthScore = Math.round(
    usageScore   * 0.40 +
    supportScore * 0.25 +
    paymentScore * 0.20 +
    revenueScore * 0.15
  );

  // ─── Risk & Churn ─────────────────────────────────────────────────────────
  let churnBonus = (daysToRenewal < 30 ? 10 : 0) + (isLate ? 15 : 0);

  // Add penalties for new fields if available
  if (tickets >= 3) churnBonus += 15;
  else if (tickets > 0) churnBonus += 5;

  if (roas > 0 && roas < 2) churnBonus += 15;
  if (trend === 'Declining') churnBonus += 15;
  if (activeCamp === 0) churnBonus += 25;
  if (callRating === 1 || callRating === 2) churnBonus += 10;

  const churnBase = 100 - healthScore;
  const churnProbability = Math.min(99, Math.max(1, churnBase + churnBonus - 10));
  
  const riskLevel = churnProbability > 65 ? 'high' : churnProbability > 40 ? 'medium' : 'low';

  // ─── Last Activity Display ────────────────────────────────────────────────
  let lastActivity;
  if (daysSinceLogin === 0)      lastActivity = 'اليوم';
  else if (daysSinceLogin === 1) lastActivity = 'أمس';
  else if (daysSinceLogin < 7)   lastActivity = `منذ ${daysSinceLogin} أيام`;
  else if (daysSinceLogin < 30)  lastActivity = `منذ ${Math.floor(daysSinceLogin / 7)} أسابيع`;
  else                           lastActivity = `منذ ${Math.floor(daysSinceLogin / 30)} أشهر`;

  // ─── AI Insights ─────────────────────────────────────────────────────────
  const aiInsights = generateInsights({
    daysSinceLogin, loginCount, tickets,
    paymentStatus, daysToRenewal, healthScore
  });

  const recommendations = generateRecommendations(healthScore, riskLevel, sector, {
    daysSinceLogin, tickets, daysToRenewal, paymentStatus
  });

  // ─── Initials & Color ────────────────────────────────────────────────────
  const words = name.split(/\s+/).filter(w => w.length > 1);
  const initials = words.length >= 2 ? words[0][0] + words[1][0] : name.slice(0, 2);
  const color = COLORS[index % COLORS.length];

  // ─── Extra raw fields ─────────────────────────────────────────────────────
  // Include all columns not mapped to standard fields as "extra"
  const standardCols = Object.values(columnMapping);
  const extraFields = {};
  for (const [key, val] of Object.entries(rawRow)) {
    if (!standardCols.includes(key)) extraFields[key] = val;
  }

  return {
    id: `CUST-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    initials,
    color,
    sector,
    plan,
    email,
    phone,
    contactPerson,
    revenue,
    paymentStatus,
    renewalDate: renewalStr,
    daysToRenewal,
    lastActivity,
    lastActivityDays: daysSinceLogin,
    health: {
      score: healthScore,
      usage: usageScore,
      support: supportScore,
      payment: paymentScore,
      revenue: Math.round(revenueScore),
    },
    rawMetrics: {
      logins: loginCount,
      tickets,
      lastLogin: lastLoginStr,
      featureUsage: parseNumber(get('feature_usage')),
      onboardingDate: onboardingStr,
      meetings30d: meetings,
      contactDays,
      contractType,
      renewalSystem: renewalSys,
      roas,
      activeCampaigns: activeCamp,
      performanceTrend: trend,
      lastCallRating: callRating,
      lastContactNotes: contactNotes
    },
    riskLevel,
    churnProbability,
    aiInsights,
    recommendations,
    extraFields,
    // Simulate usage data for the chart (30 days)
    usageData: generateUsageData(usageScore, loginCount),
    // Previous score for live diff tracking
    previousScore: null,
    lastAnalyzed: new Date().toISOString(),
  };
}

import { analyzeCustomerBatch } from './geminiService';
import { groqAnalyzeCustomerBatch, isGroqAvailable } from './groqService';

// Ensemble AI: runs Gemini + Groq in parallel and merges results for higher accuracy
async function smartAnalyzeBatch(batch) {
  const geminiPromise = analyzeCustomerBatch(batch).catch(e => { console.warn('Gemini batch failed:', e.message); return null; });
  const groqPromise = isGroqAvailable()
    ? groqAnalyzeCustomerBatch(batch).catch(e => { console.warn('Groq batch failed:', e.message); return null; })
    : Promise.resolve(null);

  const [geminiResults, groqResults] = await Promise.all([geminiPromise, groqPromise]);

  // If only one succeeded, return it
  if (!geminiResults && !groqResults) throw new Error('كلا الخدمتين فشلتا');
  if (!geminiResults) return groqResults;
  if (!groqResults) return geminiResults;

  // Merge both results — Ensemble for higher accuracy
  console.log('🧠 Ensemble AI: merging Gemini + Groq results...');
  return geminiResults.map(geminiItem => {
    const groqItem = groqResults.find(g => g.id === geminiItem.id);
    if (!groqItem) return geminiItem;

    // Average the risk scores from both models
    const avgScore = Math.round((geminiItem.riskScore + groqItem.riskScore) / 2);
    // Determine final risk level from average
    const finalLevel = avgScore >= 65 ? 'high' : avgScore >= 35 ? 'medium' : 'low';

    // Merge insights — combine unique ones from both
    const allInsights = [...(geminiItem.aiInsights || []), ...(groqItem.aiInsights || [])];
    const uniqueInsights = allInsights.filter((insight, idx, arr) =>
      arr.findIndex(x => x.text?.slice(0, 20) === insight.text?.slice(0, 20)) === idx
    ).slice(0, 4);

    // Merge recommendations — combine unique ones
    const allRecs = [...(geminiItem.recommendations || []), ...(groqItem.recommendations || [])];
    const uniqueRecs = allRecs.filter((rec, idx, arr) =>
      arr.findIndex(x => x.title === rec.title) === idx
    ).slice(0, 3);

    return {
      ...geminiItem,
      riskScore: avgScore,
      riskLevel: finalLevel,
      aiInsights: uniqueInsights,
      recommendations: uniqueRecs,
    };
  });
}

/**
 * Batch analyze all rows with basic logic, then use AI (Groq/Gemini) to predict risk and insights
 */
export async function analyzeAll(rows, columnMapping, onProgress) {
  // 1. Basic formatting and logic
  let customers = rows.map((row, i) => analyzeCustomer(row, columnMapping, i));

  // 2. Batch processing via AI
  const BATCH_SIZE = 20; // Number of customers per request
  const totalBatches = Math.ceil(customers.length / BATCH_SIZE);
  
  for (let i = 0; i < totalBatches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, customers.length);
    const batch = customers.slice(start, end);

    if (onProgress) {
      onProgress(Math.round((i / totalBatches) * 100));
    }

    try {
      const aiResults = await smartAnalyzeBatch(batch);
      aiResults.forEach(aiResult => {
        const custIndex = customers.findIndex(c => c.id === aiResult.id);
        if (custIndex !== -1) {
          customers[custIndex].riskLevel = aiResult.riskLevel || customers[custIndex].riskLevel;
          customers[custIndex].churnProbability = aiResult.riskScore || customers[custIndex].churnProbability;
          customers[custIndex].aiInsights = aiResult.aiInsights || customers[custIndex].aiInsights;
          customers[custIndex].recommendations = aiResult.recommendations || customers[custIndex].recommendations;
        }
      });
    } catch (err) {
      console.error(`Failed to analyze batch ${i+1}, using simulation mode:`, err);
      // SIMULATION MODE FALLBACK
      batch.forEach(c => {
        const custIndex = customers.findIndex(cust => cust.id === c.id);
        if (custIndex !== -1) {
          const cust = customers[custIndex];
          const risk = cust.churnProbability || 30;
          
          let insights = [];
          let recs = [];
          
          // Dynamic insights based on actual data
          if (cust.paymentStatus === 'متأخر' || cust.paymentStatus === 'مرفوض') {
             insights.push({ type: 'danger', text: `مشكلة في الدفع (${cust.paymentStatus})` });
             recs.push({ icon: '💳', title: 'تسوية المدفوعات', desc: 'التواصل الفوري لحل مشكلة الدفع', priority: 'حرجة' });
          }
          
          if (cust.lastActivityDays > 14) {
             insights.push({ type: 'warning', text: `لم يقم بتسجيل الدخول منذ ${cust.lastActivityDays} يوم` });
             recs.push({ icon: '📞', title: 'مكالمة Follow-up', desc: 'معرفة سبب انقطاع Customer عن المنصة', priority: 'Highة' });
          }
          
          if (cust.rawMetrics?.tickets >= 2) {
             insights.push({ type: 'danger', text: `تكرار طلبات الدعم الفني (${cust.rawMetrics.tickets} شكاوى)` });
             recs.push({ icon: '🛠️', title: 'مراجعة الدعم', desc: 'التأكد من حل مشاكل Customer التقنية', priority: 'Highة' });
          }
          
          if (cust.daysToRenewal < 30 && cust.daysToRenewal > 0) {
             insights.push({ type: 'info', text: `موعد التNew بعد ${cust.daysToRenewal} يوم` });
             recs.push({ icon: '📄', title: 'عرض تNew', desc: 'تقديم عرض التNew المبكر للcustomer(s)', priority: 'Mediumة' });
          }

          if (insights.length === 0) {
             if (risk > 50) {
               insights.push({ type: 'warning', text: 'استخدام متذبذب للمنصة مؤخراً' });
               recs.push({ icon: '👀', title: 'مراقبة الحساب', desc: 'Follow-up أداء Customer عن كثب هذا الأسبوع', priority: 'Mediumة' });
             } else {
               insights.push({ type: 'success', text: 'استخدام مستمر ومنتظم' });
               recs.push({ icon: '⭐', title: 'ترقية الحساب', desc: 'اقتراح خطة أعلى بناءً على الاستخدام الHigh', priority: 'Lowة' });
             }
          }

          if (risk > 70) cust.riskLevel = "high";
          else if (risk > 40) cust.riskLevel = "medium";
          else cust.riskLevel = "low";
          
          cust.aiInsights = insights;
          cust.recommendations = recs;
        }
      });
    }
  }

  if (onProgress) {
    onProgress(100);
  }

  return customers;
}

/**
 * Re-analyze with slight random drift to simulate live changes
 */
export function simulateLiveDrift(customers) {
  return customers.map(c => {
    const drift = Math.floor(Math.random() * 7) - 3; // -3 to +3
    const newScore = Math.max(0, Math.min(100, c.health.score + drift));
    const newRisk  = newScore < 40 ? 'high' : newScore < 70 ? 'medium' : 'low';
    const changed  = newRisk !== c.riskLevel;
    return {
      ...c,
      previousScore: c.health.score,
      health: { ...c.health, score: newScore },
      riskLevel: newRisk,
      churnProbability: Math.max(1, Math.min(99, c.churnProbability + drift * -1)),
      _riskChanged: changed,
      _driftAmount: drift,
      lastAnalyzed: new Date().toISOString(),
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateInsights({ daysSinceLogin, loginCount, tickets, paymentStatus, daysToRenewal, healthScore }) {
  const insights = [];

  // زيارة / تواصل
  if (daysSinceLogin > 21)
    insights.push({ type: 'danger',  text: `لم يتواصل أو يزور منذ ${daysSinceLogin} يوماً — Customer على وشك الانقطاع عن الخدمة` });
  else if (daysSinceLogin > 10)
    insights.push({ type: 'warning', text: `انخفاض في التواصل — آخر زيارة أو تواصل كان منذ ${daysSinceLogin} أيام` });


  // الاستفسارات (بالأيام)
  if (tickets > 0)
    insights.push({ type: 'info',  text: `تواصل Customer واستفسر خلال ${tickets} أيام — مؤشر لتفاعل Customer واهتمامه بالخدمة` });

  if (paymentStatus === 'متأخر')
    insights.push({ type: 'danger',  text: 'الدفع متأخر — خطر فوري على الاستمرارية' });
  if (paymentStatus === 'مرفوض')
    insights.push({ type: 'danger',  text: 'فشل في عملية الدفع — تدخل عاجل مطلوب' });

  if (daysToRenewal < 0)
    insights.push({ type: 'danger',  text: `انتهى موعد التNew منذ ${Math.abs(daysToRenewal)} يوماً` });
  else if (daysToRenewal < 30)
    insights.push({ type: 'warning', text: `موعد التNew خلال ${daysToRenewal} يوم — يحتاج Follow-up عاجلة` });

  if (insights.length === 0) {
    if (healthScore >= 80)
      insights.push({ type: 'success', text: 'Customer في وضع صحي ممتاز — استمر في الFollow-up الدورية' });
    else
      insights.push({ type: 'info',    text: 'لا توجد تحذيرات حرجة حالياً، لكن يُنصح بالFollow-up الدورية' });
  }
  return insights;
}

function generateRecommendations(score, riskLevel, sector, { daysSinceLogin, tickets, daysToRenewal, paymentStatus }) {
  const recs = [];
  if (riskLevel === 'high') {
    recs.push({ icon: '🚨', title: 'تواصل فوري من Assigned To', desc: 'يجب الاتصال بCustomer خلال 24 ساعة لمعرفة سبب التوقف وعرض المساعدة', priority: 'حرجة' });
    if (paymentStatus !== 'مدفوع')
      recs.push({ icon: '💳', title: 'تسوية مشكلة الدفع', desc: 'تنسيق مع فريق المالية فوراً لحل مشكلة الدفع وإعادة تفعيل الخدمة', priority: 'حرجة' });

    if (daysSinceLogin > 14)
      recs.push({ icon: '🏠', title: 'زيارة ميدانية للcustomer(s)', desc: 'زيارة Customer شخصياً أو دعوته لزيارة الفرع لاستعادة الثقة', priority: 'Highة' });
  } else if (riskLevel === 'medium') {
    recs.push({ icon: '📞', title: 'مكالمة Follow-up من الموظف', desc: 'تواصل أسبوعي لضمان رضا Customer عن الخدمات المقدمة', priority: 'Highة' });
    if (daysSinceLogin > 10)
      recs.push({ icon: '📋', title: 'تعريف Customer بالخدمات الNewة', desc: 'إرسال بروشور أو تقديم عرض تقديمي للخدمات التي لم يجربها بعد', priority: 'Mediumة' });
    if (daysToRenewal < 60)
      recs.push({ icon: '📄', title: 'عرض تNew الخدمة مبكراً', desc: `تقديم عرض تNew خاص لفئة ${sector} قبل انتهاء مدة الخدمة`, priority: 'Mediumة' });
    recs.push({ icon: '⭐', title: 'استطلاع رأي Customer', desc: 'إرسال استبيان قصير لقياس مستوى الرضا واكتشاف المشاكل مبكراً', priority: 'Mediumة' });
  } else {
    recs.push({ icon: '🎁', title: 'برنامج مكافآت الولاء', desc: 'دعوة Customer للانضمام لبرنامج نقاط المكافآت أو Customers المميزين', priority: 'Lowة' });
    recs.push({ icon: '🚀', title: 'عرض ترقية لخدمة أعلى', desc: 'تقديم عرض ترقية للباقة الأعلى بناءً على حجم استخدام الخدمات', priority: 'Lowة' });
    recs.push({ icon: '📣', title: 'طلب تقييم ومراجعة', desc: 'اطلب من Customer الراضي تقييم الخدمة أو إحالة أصدقائه', priority: 'Lowة' });
  }
  return recs;
}

function generateUsageData(usageScore, loginCount) {
  return Array.from({ length: 30 }, (_, i) => {
    const base = loginCount > 0 ? loginCount / 30 : usageScore / 20;
    return {
      day: i + 1,
      logins: Math.max(0, Math.round(base + Math.sin(i * 0.5) * base * 0.4 + Math.random() * base * 0.3)),
    };
  });
}

/**
 * Compute dashboard aggregate stats from analyzed customers
 */
export function computeStats(customers) {
  const total = customers.length;
  if (total === 0) return null;
  const high   = customers.filter(c => c.riskLevel === 'high').length;
  const medium = customers.filter(c => c.riskLevel === 'medium').length;
  const low    = customers.filter(c => c.riskLevel === 'low').length;
  const avgHealth = Math.round(customers.reduce((a, c) => a + c.health.score, 0) / total);
  const retentionRate = Math.round((low / total) * 100);
  const totalRevenue = customers.reduce((a, c) => a + (c.revenue || 0), 0);

  // By sector
  const bySector = {};
  customers.forEach(c => {
    if (!bySector[c.sector]) bySector[c.sector] = { high: 0, medium: 0, low: 0 };
    bySector[c.sector][c.riskLevel]++;
  });

  return {
    total, high, medium, low, avgHealth, retentionRate, totalRevenue,
    sectorData: Object.entries(bySector)
      .map(([sector, counts]) => ({ sector, ...counts }))
      .sort((a, b) => b.high - a.high)
      .slice(0, 10),
  };
}
