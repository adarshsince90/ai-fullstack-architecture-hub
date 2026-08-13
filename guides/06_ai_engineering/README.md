# Domain 6: AI Enablement & Modern SDLC

Welcome to the **AI Enablement & Modern SDLC** domain guide. This module covers production patterns for integrating enterprise AI into full-stack and systems architectures, including Retrieval-Augmented Generation (RAG), Azure OpenAI, Vector Databases, Semantic Kernel in .NET, and AI-assisted development productivity.

---

## 🗺️ Domain Mind Map & Subtopics

```text
AI Enablement & Modern SDLC
 ├── 1. Retrieval-Augmented Generation (RAG) Architecture & Vector Embeddings
 ├── 2. Azure OpenAI & Semantic Kernel Orchestration in .NET
 └── 3. AI-Assisted SDLC, Prompt Engineering & Secure Code Generation
```

---

## 📚 Detailed Guides

1. [01_rag_vector_search.md](./guides/06_ai_engineering/01_rag_vector_search.md)
   - RAG Pipeline: Document chunking strategies, Embedding models (`text-embedding-3-small`), Vector index search (Cosine Similarity, HNSW, FAISS, Pinecone, Qdrant).
   - Preventing hallucination, context window optimization, and Re-ranking (Cross-Encoders).

2. [02_azure_openai_semantic_kernel.md](./guides/06_ai_engineering/02_azure_openai_semantic_kernel.md)
   - Azure OpenAI enterprise privacy and network isolation (Private Endpoints).
   - Microsoft Semantic Kernel in C#/.NET: Plugins, Planners, Memory connectors, Function calling / Tool use.

3. [03_ai_assisted_sdlc.md](./guides/06_ai_engineering/03_ai_assisted_sdlc.md)
   - AI tools in daily engineering: GitHub Copilot, Cursor AI, Antigravity, Claude, ChatGPT.
   - Structured Prompt Engineering (Few-Shot, Chain-of-Thought, System Instructions).
   - Automated unit test generation, security vulnerability triaging, and documentation generation.
