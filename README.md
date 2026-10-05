# Kesra AI Customer Retention Agent 🤖📈

Welcome to the **Kesra AI Customer Retention Agent** repository. This system is designed specifically for **Kesra Agency** to analyze customer data, predict churn risk, and provide actionable AI-driven insights to improve customer retention.

## 🌟 Overview

The AI Customer Retention Agent leverages cutting-edge AI models (including Google Gemini and Groq) to monitor customer health metrics. By automatically analyzing usage patterns, engagement levels, and feedback, the system identifies at-risk customers early, allowing the agency to take proactive steps to retain them.

## ✨ Key Features

- **📊 Interactive Dashboard:** A comprehensive view of customer metrics, health scores, and overall agency performance.
- **🧠 AI-Powered Analysis:** Integrates with LLMs to generate personalized retention strategies for each customer.
- **⚠️ Risk Assessment:** Automatically categorizes customers into High, Medium, and Low risk tiers based on their behavior.
- **📥 Data Upload & Parsing:** Easily import customer data via CSV for instant AI analysis.
- **⚡ Fast & Modern UI:** Built with React and Vite for a seamless, lightning-fast user experience.

## 🛠️ Technology Stack

- **Frontend:** React, Vite, Tailwind CSS (or custom CSS modules)
- **Backend/API:** Node.js, Express (if applicable)
- **AI Integrations:** Google Gemini API, Groq API
- **Database/Storage:** Supabase

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ranahassan2/Kesra-AI-Customer-Retention-Agent.git
   cd Kesra-AI-Customer-Retention-Agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your API keys (Note: Keep these secure and do not push them to the repository).
   ```env
   VITE_GEMINI_API_KEY=your_gemini_key_here
   VITE_GROQ_API_KEY=your_groq_key_here
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 🔒 Security Note
This repository relies on sensitive API keys to function. Ensure that your `.env` file is never committed to version control. If deploying, use the platform's native environment variable management.

---
*Built with ❤️ for Kesra Agency.*
