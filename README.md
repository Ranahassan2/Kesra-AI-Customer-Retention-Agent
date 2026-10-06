<h1 align="center">Kesra AI Customer Retention Agent</h1>

<p align="center">
  <b>LLM-driven customer retention agent using semantic search (RAG) and sentiment analysis to automate engagement.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54" alt="Python" />
  <img src="https://img.shields.io/badge/LangChain-121212.svg?style=for-the-badge&logo=chainlink&logoColor=white" alt="LangChain" />
  <img src="https://img.shields.io/badge/OpenAI-412991.svg?style=for-the-badge&logo=OpenAI&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Pinecone-000000.svg?style=for-the-badge" alt="Pinecone" />
  <img src="https://img.shields.io/badge/pandas-%23150458.svg?style=for-the-badge&logo=pandas&logoColor=white" alt="Pandas" />
</p>

---

### Overview

The **Kesra AI Customer Retention Agent** is an autonomous AI system designed to proactively identify at-risk customers, analyze their sentiment, and engage them with highly personalized retention strategies. By leveraging Retrieval-Augmented Generation (RAG), the agent accesses historical interaction data to craft context-aware responses and offers, significantly reducing churn rates.

### Core Architecture

- **Semantic Search (RAG):** Utilizes `Pinecone` vector databases to instantly retrieve relevant customer history and company policies.
- **Sentiment Analysis:** Continuously monitors customer communications to detect dissatisfaction early using NLP models.
- **Automated Engagement:** Generates and dispatches hyper-personalized emails or messages using `OpenAI` LLMs orchestrated by `LangChain`.
- **Data Processing:** Leverages `Pandas` for robust data wrangling of customer datasets prior to embedding.

### Key Features

1. **Predictive Churn Detection:** Flags customers with high churn probability based on interaction sentiment and activity drops.
2. **Context-Aware Responses:** RAG architecture ensures the AI never hallucinates offers and always respects company retention guidelines.
3. **Autonomous Execution:** Can be deployed to run in the background, automatically handling routine retention tasks without human intervention.

---
<p align="center">
  <i>Architected and Maintained by <a href="https://github.com/Ranahassan2">Rana Hassan</a> (Head of AI @ SEG)</i>
</p>
