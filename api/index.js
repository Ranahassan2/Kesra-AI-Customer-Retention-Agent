import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load .env from the root directory
dotenv.config({ path: '../.env' });
// Also try current directory just in case it's run from root
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large batches

const apiKeys = [
  process.env.VITE_GEMINI_API_KEY_1,
  process.env.VITE_GEMINI_API_KEY_2,
  process.env.VITE_GEMINI_API_KEY_3,
  process.env.VITE_GEMINI_API_KEY_4,
  process.env.VITE_GEMINI_API_KEY,
].filter(Boolean);

let currentKeyIndex = 0;

app.post('/api/analyzeCustomerBatch', async (req, res) => {
  try {
    const { customersBatch } = req.body;
    
    if (apiKeys.length === 0) {
      return res.status(500).json({ error: "لم يتم إعداد مفاتيح Gemini API" });
    }

    const batchData = customersBatch.map(c => `
      [ID: ${c.id}]
      - الاسم: ${c.name}
      - القطاع: ${c.sector}
      - الخطة: ${c.plan}
      - الإيراد: ${c.revenue}
      - حالة الدفع: ${c.paymentStatus}
      - حالة الحساب (يدوية من المسؤول): ${c.status || 'جديد'}
      - أيام منذ آخر زيارة: ${c.lastActivityDays}
      - التذاكر السابقة: ${c.rawMetrics?.tickets || 0}
      - الموظف المسؤول: ${c.contactPerson || 'غير متوفر'}
    `).join('\n\n');

    const prompt = `
      You are an advanced Customer Success Manager & Data Scientist.
      Analyze the following batch of customer data deeply to detect churn risk.
      
      Focus on:
      1. Low engagement: days since last login.
      2. Support issues: high number of tickets.
      3. Payment status: any delay is high risk.
      
      Data:
      ${batchData}
      
      Output JSON Array strictly with no markdown formatting:
      [
        {
          "id": "same id",
          "riskScore": (number 0-100 representing churn probability),
          "riskLevel": ("high", "medium", or "low"),
          "aiInsights": [
            {"type": "danger" | "warning" | "info" | "success", "text": "insight text in english"}
          ],
          "recommendations": [
            {"icon": "🚨", "title": "Action title in english", "desc": "Action description in english", "priority": "high", "medium", or "low"}
          ]
        }
      ]
    `;

    const groqKey = process.env.VITE_GROQ_API_KEY;

    for (let i = 0; i < apiKeys.length; i++) {
      const keyToTry = apiKeys[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(keyToTry);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        let jsonStr = text.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
        jsonStr = jsonStr.trim();
        
        const parsed = JSON.parse(jsonStr);
        return res.json(parsed);
      } catch (error) {
        console.error(`Error with Gemini Key at index ${currentKeyIndex}:`, error.message);
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
      }
    }

    // Fallback to Groq API if all Gemini keys fail
    if (groqKey) {
      console.log("Gemini failed, trying Groq API...");
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192', // Or another strong groq model
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices[0].message.content;
          let jsonStr = text.trim();
          if (jsonStr.startsWith('```json')) jsonStr = jsonStr.substring(7);
          if (jsonStr.startsWith('```')) jsonStr = jsonStr.substring(3);
          if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
          
          return res.json(JSON.parse(jsonStr.trim()));
        } else {
          console.error("Groq API error:", await response.text());
        }
      } catch (groqError) {
        console.error("Error calling Groq:", groqError.message);
      }
    }

    throw new Error("فشل التحليل بسبب نفاذ الرصيد من Gemini و Groq أو خطأ في الاتصال.");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/analyzeCustomerData', async (req, res) => {
  try {
    const { customer } = req.body;
    
    if (apiKeys.length === 0) {
      return res.status(500).json({ error: "لم يتم إعداد مفاتيح Gemini API" });
    }

    const groqKey = process.env.VITE_GROQ_API_KEY;

    const prompt = `
      ## Role
      You are an Account Health Analyst specializing in digital marketing agencies. Your task is to analyze customer data and output a precise health evaluation, risk level, and actionable recommendations.

      ## Customer Data:
      - Name: ${customer.name}
      - Sector: ${customer.sector}
      - Plan: ${customer.plan}
      - Monthly Revenue: ${customer.revenue} SAR
      - Payment Status: ${customer.paymentStatus}
      - Account Status: ${customer.status || 'New'}
      - Contact Person: ${customer.contactPerson || 'N/A'}

      ## Full Output Schema
      Return exactly ONE JSON object (no markdown, no extra text) with the following structure:
      {
        "overall_risk_score": 50,
        "risk_level": "Red | Yellow | Green",
        "key_risk_drivers": ["Reason 1", "Reason 2"],
        "key_positive_signals": ["Positive 1"],
        "recommended_actions": [
          { "action": "Action text", "priority": "High" }
        ]
      }
    `;

    for (let i = 0; i < apiKeys.length; i++) {
      const keyToTry = apiKeys[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(keyToTry);
      const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
        return res.json(JSON.parse(jsonStr));
      } catch (error) {
        console.error(`Error with API Key at index ${currentKeyIndex}:`, error);
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
      }
    }

    if (groqKey) {
      console.log("Gemini failed, trying Groq API for single customer...");
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-70b-8192',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices[0].message.content;
          const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
          return res.json(JSON.parse(jsonStr));
        }
      } catch (groqError) {
        console.error("Error calling Groq:", groqError.message);
      }
    }

    throw new Error("فشل التحليل");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vercel serverless export
export default app;
