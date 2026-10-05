import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyzeCustomerData } from '../lib/geminiService';
import { groqAnalyzeCustomerData, isGroqAvailable } from '../lib/groqService';
import { ArrowRight, Phone, Mail, User, Calendar, CreditCard } from 'lucide-react';
import { Chart, registerables } from 'chart.js';
import { useData } from '../store/dataStore';
import RiskBadge from '../components/RiskBadge';
import { getHealthColor } from '../components/HealthBar';

Chart.register(...registerables);

function GaugeChart({ score, status }) {
  const ref = useRef(); const chartRef = useRef();
  useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    const color = getHealthColor(score);
    const remaining = 100 - score;
    chartRef.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, remaining],
          backgroundColor: [color, '#1A2235'],
          borderColor: 'transparent',
          borderWidth: 0,
          circumference: 240,
          rotation: 240,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: true, cutout: '78%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 1000 },
      },
    });
    return () => chartRef.current?.destroy();
  }, [score]);
  const color = getHealthColor(score);
  // If status is 'Resolved', always show as resolved regardless of score
  const riskLabel = status === 'Resolved' ? 'Resolved ✓' 
    : score < 30 ? 'حرج' 
    : score < 50 ? 'High' 
    : score < 70 ? 'Medium' 
    : 'Low';
  const labelColor = status === 'Resolved' ? '#10B981' : color;
  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <canvas ref={ref}></canvas>
      <div style={{ position: 'absolute', top: '44%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 42, fontWeight: 900, color: labelColor, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Health Score</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: labelColor, marginTop: 4, background: `${labelColor}20`, padding: '2px 10px', borderRadius: 99 }}>{riskLabel}</div>
      </div>
    </div>
  );
}

function UsageLineChart({ data }) {
  const ref = useRef(); const chartRef = useRef();
  useEffect(() => {
    if (!ref.current || !data?.length) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: data.map(d => `يوم ${d.day}`),
        datasets: [{
          label: 'عدد الاجتماعات',
          data: data.map(d => d.logins),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#94A3B8', font: { family: 'Cairo', size: 9 }, maxTicksLimit: 10 }, grid: { display: false }, border: { display: false } },
          y: { ticks: { color: '#94A3B8', font: { family: 'Cairo', size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false }, beginAtZero: true },
        },
        plugins: { legend: { display: false }, tooltip: { rtl: true, bodyFont: { family: 'Cairo', size: 12 } } },
        animation: { duration: 800 },
      },
    });
    return () => chartRef.current?.destroy();
  }, [data]);
  return <canvas ref={ref} style={{ height: '100%' }}></canvas>;
}

const priorityColor = { حرجة: 'priority-critical', Highة: 'priority-high', Mediumة: 'priority-medium', Lowة: 'priority-low' };

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, updateCustomer } = useData();
  const c = customers.find(x => x.id === id);

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      let finalResult = null;

      // أولوية التحليل لـ Groq لأنه أسرع ويعمل بشكل سليم
      if (isGroqAvailable()) {
        try {
          finalResult = await groqAnalyzeCustomerData(c);
        } catch (e) {
          console.warn('Groq failed:', e.message);
        }
      }

      // كبديل احتياطي، إذا لم يعمل Groq نستخدم Gemini
      if (!finalResult) {
        try {
          finalResult = await analyzeCustomerData(c);
        } catch (e) {
          console.warn('Gemini failed:', e.message);
        }
      }

      if (!finalResult) throw new Error('فشلت جميع خدمات التحليل');
      
      setAiAnalysis(finalResult);

      // 🔄 Update the global state with the AI's prediction so it reflects everywhere!
      if (updateCustomer) {
        // Translate AI's risk_level (أحمر / أصفر / أخضر) to the app's standard risk levels (high / medium / low)
        let standardRiskLevel = 'medium';
        if (finalResult.risk_level === 'أحمر') standardRiskLevel = 'high';
        if (finalResult.risk_level === 'أخضر') standardRiskLevel = 'low';

        // overall_risk_score is 0-100 (where 100 = very risky). Health score is 100 - risk.
        const predictedChurn = finalResult.overall_risk_score;
        const predictedHealth = 100 - predictedChurn;

        updateCustomer(c.id, {
          riskLevel: standardRiskLevel,
          churnProbability: predictedChurn,
          health: {
            ...c.health,
            score: predictedHealth
          }
        });
      }
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!c) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Customer غير موجود</div>
        <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => navigate('/customers')}>
          <ArrowRight size={14} /> العودة للقائمة
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-content">
        {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }} onClick={handleAnalyze} disabled={isAnalyzing}>
          <span style={{ fontSize: 16 }}>⚙️</span> {isAnalyzing ? 'جاري الAnalyze...' : 'تفعيل Analyze Artificial Intelligence'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{c.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              {c.sector} · {c.plan} · {c.revenue > 0 ? `إيراد شهري ${c.revenue.toLocaleString()} SAR` : ''}
            </div>
          </div>
          <button className="back-btn" onClick={() => navigate('/customers')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            رجوع <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left Column (Company Details & AI) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card premium-card">
            <div className="section-label" style={{ textAlign: 'right' }}>تفاصيل الشركة والتعاقد</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              {[
                { label: 'Phone Number', val: c.phone ? <a href={`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#10B981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}><Phone size={14} /> {c.phone}</a> : 'None' },
                { label: 'Sector', val: c.sector },
                { label: 'Plan', val: c.plan },
                { label: 'تاريخ بداية التعاقد', val: c.rawMetrics?.onboardingDate || 'N/A' },
                { label: 'Renewal Date', val: c.renewalDate || 'N/A' },
                { label: 'نوع العقد', val: c.rawMetrics?.contractType || 'N/A' },
                { label: 'نظام التNew', val: c.rawMetrics?.renewalSystem || 'N/A' },
                { label: 'Monthly Revenue', val: c.revenue > 0 ? `${c.revenue.toLocaleString()} SAR` : 'None' },
                { label: 'حالة الدفع', val: c.paymentStatus, isDanger: c.paymentStatus === 'متأخر' },
                { label: 'Assigned To', val: c.contactPerson || 'N/A' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: item.isDanger ? '#EF4444' : 'var(--text-primary)', fontWeight: item.isDanger ? 700 : 400 }}>{item.val}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card premium-card" style={{ background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(37, 99, 235, 0.05) 100%)', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 24, color: 'var(--primary-light)' }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Analyze بيانات Customer</div>
            </div>
            {aiAnalysis ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 13, color: '#10B981', marginBottom: 8 }}>✅ تم إجراء الAnalyze بنجاح</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>التقرير يظهر أدناه في الصفحة</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'right', marginBottom: 20 }}>
                  احصل على Analyze شامل لبيانات Customer باستخدام أدوات الAnalyze المتقدمة لاكتشاف أنماط المخاطرة وأسباب الخطر وتوصيات الحفاظ.
                </div>
                {analysisError && <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 12, textAlign: 'right' }}>{analysisError}</div>}
                <button 
                  className="premium-btn" 
                  style={{ background: 'linear-gradient(90deg, #2563EB, #4F46E5)', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)' }}
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'جاري الAnalyze...' : 'بدء الAnalyze'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Middle Column (Gauge & Health Breakdown) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card premium-card" style={{ textAlign: 'center' }}>
            <GaugeChart score={c.health.score} status={c.status} />
            
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, padding: '0 10px' }}>
                <span style={{ color: '#EF4444', fontWeight: 700 }}>{c.churnProbability}%</span>
                <span style={{ color: 'var(--text-muted)' }}>إمكانية المغادرة</span>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', margin: '0 10px' }}>
                <div style={{ width: `${c.churnProbability}%`, height: '100%', background: '#EF4444', borderRadius: 99, boxShadow: '0 0 10px #EF4444' }}></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-label">تفصيل Health Score</div>
            {[
              { label: 'الاستخدام', val: c.health.usage, pct: 40, note: `${c.lastActivityDays} يوم منذ آخر دخول` },
              { label: 'الدعم',     val: c.health.support, pct: 25, note: `${c.rawMetrics?.tickets || 0} تذاكر / شكاوى` },
              { label: 'الدفع',     val: c.health.payment, pct: 20, note: c.paymentStatus + (c.renewalDate ? ` · تNew: ${c.renewalDate}` : '') },
              { label: 'الإيراد',   val: c.health.revenue, pct: 15, note: c.revenue > 0 ? `${c.revenue.toLocaleString()} SAR` : 'None' },
            ].map(item => (
              <div key={item.label} className="breakdown-item" style={{ marginBottom: 12 }}>
                <div className="breakdown-label">
                  <span className="breakdown-key">{item.label} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({item.pct}%)</span></span>
                  <span className="breakdown-val" style={{ color: getHealthColor(item.val) }}>{item.val}</span>
                </div>
                <div className="breakdown-bar">
                  <div className="breakdown-fill" style={{ width: `${item.val}%`, background: getHealthColor(item.val) }}></div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{item.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (Usage & Support) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {c.usageData?.length > 0 && (
            <div className="card premium-card">
              <div className="section-label" style={{ textAlign: 'right' }}>Analyze النشاط</div>
              <div style={{ height: 120, marginTop: 10 }}><UsageLineChart data={c.usageData} /></div>
            </div>
          )}

          <div className="card premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div className="section-label" style={{ textAlign: 'right' }}>Usage & Performance</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{c.rawMetrics?.activeCampaigns || 0}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Active Campaigns</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{c.rawMetrics?.roas || 0}</span>
                  <span style={{ color: 'var(--text-muted)' }}>العائد على الإنفاق (ROAS)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: c.rawMetrics?.performanceTrend === 'Declining' ? '#EF4444' : c.rawMetrics?.performanceTrend === 'Improving' ? '#10B981' : 'var(--text-primary)' }}>{c.rawMetrics?.performanceTrend || 'N/A'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Performance Trend</span>
                </div>
              </div>
            </div>

            <div>
              <div className="section-label" style={{ textAlign: 'right' }}>Support History</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: c.rawMetrics?.tickets > 0 ? '#EF4444' : '#10B981', fontWeight: 700 }}>{c.rawMetrics?.tickets || 0}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Support Tickets</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{c.rawMetrics?.meetings30d || 0}</span>
                  <span style={{ color: 'var(--text-muted)' }}>الاجتماعات (30 يوم)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{c.rawMetrics?.contactDays || 0}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: c.rawMetrics?.lastCallRating <= 2 && c.rawMetrics?.lastCallRating > 0 ? '#EF4444' : c.rawMetrics?.lastCallRating >= 4 ? '#10B981' : 'var(--text-primary)' }}>{c.rawMetrics?.lastCallRating ? `${c.rawMetrics.lastCallRating}/5` : 'N/A'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>Last Call Rating</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card premium-card">
            <div className="section-label" style={{ textAlign: 'right' }}>Last Contact Notes</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 12, textAlign: 'right', background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 8, fontStyle: 'italic', borderRight: '3px solid var(--primary-light)' }}>
              {c.rawMetrics?.lastContactNotes || 'لا توجد ملاحظات مسجلة لهذه الشركة.'}
            </div>
          </div>

          <div className="card premium-card">
            <div className="section-label" style={{ textAlign: 'right' }}>Assignment History</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {c.assignmentHistory && c.assignmentHistory.length > 0 ? (
                c.assignmentHistory.map((hist, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(hist.date).toLocaleDateString('ar-EG')}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}><User size={12} style={{ display: 'inline', marginRight: 4, color: 'var(--primary-light)' }} /> {hist.employee}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>لم يتم تعيين أي موظف حتى الآن.</div>
              )}
            </div>
          </div>
        </div>

          <div className="card premium-card" style={{ marginTop: 16 }}>
            <div className="section-label" style={{ textAlign: 'right' }}>سجل نشاط Customer (Audit Log)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
              {c.customerLogs && c.customerLogs.length > 0 ? (
                [...c.customerLogs].reverse().map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{log.action}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}><User size={10} style={{ display: 'inline', marginRight: 2 }} /> By: {log.employee}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(log.date).toLocaleDateString('ar-EG')} - {new Date(log.date).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>None سجل نشاط مسجل حتى الآن.</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== AI ANALYSIS INLINE SECTION ===== */}
        {aiAnalysis && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'right' }}>
            {/* Section Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(37,99,235,0.2)', paddingBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>تاريخ الAnalyze: {aiAnalysis.analysis_date}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 24 }}>🤖</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>التقرير الذكي الشامل</div>
              </div>
            </div>

            {/* 1. Score & Revenue at risk */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(0,0,0,0) 100%)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>الدرجة النهائية للمخاطرة</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 42, fontWeight: 900, color: aiAnalysis.risk_level === 'أحمر' ? '#EF4444' : aiAnalysis.risk_level === 'أصفر' ? '#F59E0B' : '#10B981', lineHeight: 1 }}>{aiAnalysis.overall_risk_score}</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: aiAnalysis.risk_level === 'أحمر' ? '#EF4444' : aiAnalysis.risk_level === 'أصفر' ? '#F59E0B' : '#10B981', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>{aiAnalysis.risk_level}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>الإيراد المعرض للخطر</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: (aiAnalysis.revenue_at_risk_sar || 0) > 0 ? '#EF4444' : 'var(--text-primary)' }}>{(aiAnalysis.revenue_at_risk_sar || 0).toLocaleString()} SAR</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-primary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                  💡 <strong>السياق:</strong> {aiAnalysis.risk_trend_vs_context}
                </div>
              </div>

              <div style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>ثقة الAnalyze</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: aiAnalysis.confidence_level === 'Highة' ? '#10B981' : aiAnalysis.confidence_level === 'Mediumة' ? '#F59E0B' : '#EF4444' }}>{aiAnalysis.confidence_level}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>اكتمال البيانات</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{aiAnalysis.data_completeness_pct}%</span>
                </div>
                {aiAnalysis.missing_fields?.length > 0 && (
                  <div style={{ marginTop: 'auto', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: 8, borderRadius: 6, fontSize: 12 }}>
                    ⚠️ <strong>ينقص:</strong> {aiAnalysis.missing_fields.join('، ')}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Category Scores */}
            {aiAnalysis.category_scores && (
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 12, color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 8 }}>📊 Analyze فئات الصحة</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  {[
                    { label: 'تفاعل Customer', val: aiAnalysis.category_scores.engagement },
                    { label: 'الخطر المالي', val: aiAnalysis.category_scores.financial_contract_risk },
                    { label: 'جودة الأداء', val: aiAnalysis.category_scores.performance_delivered },
                    { label: 'مستوى الدعم', val: aiAnalysis.category_scores.satisfaction_support }
                  ].map(cat => (
                    <div key={cat.label} style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{cat.label}</span>
                        <span style={{ fontSize: 18, fontWeight: 800, color: cat.val === null ? 'var(--text-muted)' : cat.val < 40 ? '#EF4444' : cat.val < 70 ? '#F59E0B' : '#10B981' }}>
                          {cat.val === null ? 'N/A' : `${cat.val}%`}
                        </span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                        <div style={{ width: cat.val === null ? '0%' : `${cat.val}%`, height: '100%', background: cat.val < 40 ? '#EF4444' : cat.val < 70 ? '#F59E0B' : '#10B981', borderRadius: 99, transition: 'width 1s ease-out' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Renewal & Sentiment */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>⏳ حالة التNew</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: aiAnalysis.renewal_urgency === 'عاجل' ? '#EF4444' : aiAnalysis.renewal_urgency === 'قريب' ? '#F59E0B' : '#10B981' }}>{aiAnalysis.renewal_urgency}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>({aiAnalysis.renewal_window_days} أيام متبقية)</span>
                </div>
              </div>
              <div style={{ flex: '1 1 300px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>💬 Analyze المشاعر</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: aiAnalysis.sentiment_from_notes === 'تحذيرية' || aiAnalysis.sentiment_from_notes === 'سلبية' ? '#EF4444' : aiAnalysis.sentiment_from_notes === 'إيجابية' ? '#10B981' : '#F59E0B' }}>
                    {aiAnalysis.sentiment_from_notes}
                  </span>
                  {aiAnalysis.sentiment_keywords?.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>بناءً على: "{aiAnalysis.sentiment_keywords.join('", "')}"</span>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Drivers & Signals */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ flex: '1 1 300px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12, padding: 16 }}>
                <h3 style={{ fontSize: 14, color: '#EF4444', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>⚠️ المحركات الأساسية للخطر</h3>
                <ul style={{ margin: 0, paddingRight: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--text-primary)' }}>
                  {aiAnalysis.key_risk_drivers?.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
              {aiAnalysis.key_positive_signals?.length > 0 && (
                <div style={{ flex: '1 1 300px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12, padding: 16 }}>
                  <h3 style={{ fontSize: 14, color: '#10B981', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>✨ إشارات إيجابية</h3>
                  <ul style={{ margin: 0, paddingRight: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--text-primary)' }}>
                    {aiAnalysis.key_positive_signals.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* 5. Recommended Actions */}
            <div style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 16, color: 'var(--primary-light)', margin: '0 0 4px 0' }}>📋 التوصيات التنفيذية</h3>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{aiAnalysis.priority_rank_reason}</div>
                </div>
                <div style={{ background: 'var(--primary-light)', color: '#000', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  أولوية {aiAnalysis.priority_this_week}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {aiAnalysis.recommended_actions?.map((r, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{r.action}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: r.priority === 'Highة' ? '#EF4444' : 'var(--text-muted)', border: '1px solid currentColor', padding: '2px 8px', borderRadius: 99 }}>{r.priority}</span>
                      <span style={{ fontSize: 12, color: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>خلال {r.due_within_days} أيام</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Upsell */}
            {aiAnalysis.upsell_opportunity && (
              <div style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>🚀</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>فرصة ترقية (Upsell)</div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{aiAnalysis.upsell_reasoning}</div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
