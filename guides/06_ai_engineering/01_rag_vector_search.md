# Retrieval-Augmented Generation (RAG) Architecture & Vector Search

Large Language Models (LLMs) possess vast generalized knowledge, but lack awareness of private enterprise data and are prone to hallucinations. **Retrieval-Augmented Generation (RAG)** bridges this gap by dynamically retrieving relevant facts from private document stores and injecting them into the LLM context prompt.

---

## 1. The End-to-End RAG Architecture

```text
[ INGESTION PIPELINE (Offline / Batch / Real-Time) ]
Enterprise Documents (PDF, MD, DOCX, SQL)
       │
       ▼ [ 1. Document Parsing & Text Cleaning ]
Clean Text
       │
       ▼ [ 2. Chunking (Fixed-Size / Semantic / Recursive) ]
Text Chunks (e.g. 500 tokens with 50-token overlap)
       │
       ▼ [ 3. Embedding Model (e.g. text-embedding-3-small) ]
1536-Dimensional Float Vectors
       │
       ▼ [ 4. Vector Database Ingestion ]
Vector DB (Azure AI Search / Pinecone / pgvector / Qdrant)
(Stored with HNSW Graph Index + Metadata: DocId, TenantId)
```

```text
[ RETRIEVAL & GENERATION PIPELINE (Online / Real-Time User Query) ]
User Prompt: "What is our enterprise refund policy for SaaS licenses?"
       │
       ▼ [ Embedding Generation ]
Query Vector (1536-dim float array)
       │
       ▼ [ Vector Similarity Search (Top-K = 3, Cosine Distance) ]
Top 3 Relevant Document Chunks Retrieved
       │
       ▼ [ Prompt Augmentation ]
┌────────────────────────────────────────────────────────┐
│ AUGMENTED LLM PROMPT:                                  │
│ System: "You are a helpful AI assistant. Answer using  │
│ only the provided context. If unsure, say 'I don't know'"│
│                                                        │
│ Context: [Document Chunks 1, 2, 3]                     │
│ User Question: "What is our enterprise refund policy?" │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [ LLM Inference (GPT-4o / Azure OpenAI) ]
Grounded Response with Exact Citations [Doc 1, Page 4]
```

---

## 2. Document Chunking Strategies

Choosing the right chunking strategy dictates retrieval accuracy:

| Strategy | Mechanics | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Fixed-Size Chunking** | Splits text every $N$ tokens (e.g. 500 tokens) with $M$ token overlap (e.g. 50 tokens). | Fast, simple, predictable. | Can split sentences or semantic ideas in half. |
| **Semantic Chunking** | Calculates cosine distance between consecutive sentences; splits when semantic distance spikes. | Preserves complete contextual thoughts. | Higher compute overhead during ingestion. |
| **Recursive Character Chunking** | Splits hierarchically by paragraph (`\n\n`), sentence (`\n`), and spaces (` `). | Balances semantic boundaries with size caps. | Standard best practice for LangChain / LlamaIndex. |

---

## 3. High-Dimensional Vector Embeddings & Similarity Metrics

An **Embedding** maps text into a high-dimensional mathematical coordinate space where semantically similar concepts are clustered closely together:

```text
"Cat" ──────► [0.23, -0.45, 0.89, ...] ──┐ Angle θ is tiny!
"Kitten" ───► [0.21, -0.42, 0.91, ...] ──┘ Cosine Similarity ≈ 0.98

"Airplane" ─► [-0.78, 0.12, -0.34, ...] ── Cosine Similarity ≈ 0.12
```

### Mathematical Distance Metrics:
1. **Cosine Similarity**: Measures the cosine of the angle $\theta$ between two normalized vectors:
   $$\text{Cosine}(\mathbf{A}, \mathbf{B}) = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$
   - Range: $-1$ (Opposite) to $+1$ (Identical). Invariant to vector magnitude.
2. **Dot Product**: $\mathbf{A} \cdot \mathbf{B}$. Faster to calculate when vectors are unit-normalized.
3. **Euclidean Distance ($L_2$)**: Straight-line distance in space.

---

## 4. Hybrid Search & Reciprocal Rank Fusion (RRF)

Dense vector search alone can struggle with exact keyword lookups (e.g. searching for exact part numbers like `SKU-89234-X`). **Hybrid Search** combines Keyword Search (BM25) with Vector Search:

```text
User Query ──┬──► BM25 Keyword Search ────────► Ranked List A (Keyword Relevance)
             │
             └──► Dense Vector Search ────────► Ranked List B (Semantic Relevance)
                                                        │
                                                        ▼
                                          [ Reciprocal Rank Fusion (RRF) ]
                                          RRF_Score = Σ (1 / (k + rank_i))
                                                        │
                                                        ▼
                                          [ Cross-Encoder Re-Ranker ]
                                                        │
                                                        ▼
                                          Optimal Top-K Context for LLM
```

---

## 5. Senior & Lead Interview Scenarios

### Q1: How do you prevent multi-tenant data leakage in an enterprise RAG system?
**Lead Answer**: Multi-tenancy in vector search requires **Pre-Filtering (Metadata Filtering)**:
1. When ingesting document chunks, attach indexed metadata fields: `tenant_id: "org_98234"`, `user_roles: ["finance_admin"]`, `confidentiality: "internal"`.
2. When querying the vector database, enforce a hard metadata filter in the search request: `filter: "tenant_id eq 'org_98234' and user_roles/any(r: r eq 'finance_admin')"`.
3. The vector engine applies the metadata constraint *before* computing HNSW vector distances, guaranteeing that no tenant ever accesses or computes similarities against another tenant's private vectors.

### Q2: What is the "Lost in the Middle" phenomenon in RAG context windows and how do you mitigate it?
**Lead Answer**: Research shows that LLMs have higher recall for information placed at the very **beginning** and the very **end** of long context prompts, while facts placed in the middle are frequently overlooked.
- **Mitigation**:
  1. Keep Top-K small and focused (Top-3 or Top-5 high-quality chunks instead of Top-50).
  2. Use a **Re-ranker** (such as Cohere Rerank or BGE-Reranker) to score and order the most relevant chunks at the extreme top of the prompt.
  3. Chunk with metadata summaries at the header of each retrieved block.
