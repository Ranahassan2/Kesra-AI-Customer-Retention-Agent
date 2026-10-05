const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export async function analyzeCustomerBatch(customersBatch) {
  try {
    const response = await fetch(`${API_URL}/analyzeCustomerBatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customersBatch })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("فشل الAnalyze عبر الخادم:", error);
    throw error;
  }
}

export async function analyzeCustomerData(customer) {
  try {
    const response = await fetch(`${API_URL}/analyzeCustomerData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("فشل الAnalyze عبر الخادم:", error);
    // Fallback simulation mode for testing
    return {
      overall_risk_score: 30,
      risk_level: "أخضر",
      key_risk_drivers: ["لا توجد مخاطر (وضع المحاكاة بسبب عدم تشغيل الخادم)"],
      key_positive_signals: [],
      recommended_actions: []
    };
  }
}

export async function generatePortfolioRiskSuggestions(customers) {
  // Can be implemented on backend as well. For now returning simple static suggestions.
  return [
    { icon: '🛡️', text: 'بناء سياسة صارمة لتحصيل الدفعات للعملاء المتعثرين مبكراً قد ينقذ 30% من الخطر المالي' },
    { icon: '📈', text: 'مراجعة حملات Customers ذوي الاستخدام الLow وتقديم تقارير أداء أسبوعية لرفع تفاعلهم 15%' },
    { icon: '🤝', text: 'عقد ورشة عمل شهرية لمعالجة أسباب عدم التNew الشائعة' }
  ];
}
