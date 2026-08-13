namespace AiEngineering.Rag;

public record DocumentChunk(string ChunkId, string DocumentId, string Text, float[] Embedding, Dictionary<string, string> Metadata);

public record SearchResult(DocumentChunk Chunk, double SimilarityScore);

// =========================================================================
// Production In-Memory Vector Search & RAG Pipeline in C#
// =========================================================================
public class RagVectorPipeline
{
    private readonly List<DocumentChunk> _vectorStore = new();

    // 1. Chunking with Overlap
    public List<string> ChunkDocument(string fullText, int chunkSize = 300, int overlap = 50)
    {
        var words = fullText.Split(new[] { ' ', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
        var chunks = new List<string>();

        int step = chunkSize - overlap;
        for (int i = 0; i < words.Length; i += step)
        {
            var chunkWords = words.Skip(i).Take(chunkSize);
            chunks.Add(string.Join(" ", chunkWords));
            if (i + chunkSize >= words.Length) break;
        }

        return chunks;
    }

    // 2. Ingest Chunks into Vector Store
    public void IndexChunk(string chunkId, string docId, string text, float[] embedding, Dictionary<string, string> metadata)
    {
        _vectorStore.Add(new DocumentChunk(chunkId, docId, text, embedding, metadata));
    }

    // 3. Mathematical Cosine Similarity Vector Search
    public List<SearchResult> SearchTopK(float[] queryEmbedding, int topK = 3, double minScore = 0.5)
    {
        var results = new List<SearchResult>();

        foreach (var chunk in _vectorStore)
        {
            double similarity = ComputeCosineSimilarity(queryEmbedding, chunk.Embedding);
            if (similarity >= minScore)
            {
                results.Add(new SearchResult(chunk, similarity));
            }
        }

        return results
            .OrderByDescending(r => r.SimilarityScore)
            .Take(topK)
            .ToList();
    }

    // Cosine Similarity Formula: (A . B) / (||A|| * ||B||)
    public static double ComputeCosineSimilarity(float[] vectorA, float[] vectorB)
    {
        if (vectorA.Length != vectorB.Length) throw new ArgumentException("Vector dimensions must match.");

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < vectorA.Length; i++)
        {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }

        if (normA == 0 || normB == 0) return 0.0;

        return dotProduct / (Math.Sqrt(normA) * Math.Sqrt(normB));
    }

    // 4. Construct Augmented Context Prompt for LLM
    public string BuildAugmentedPrompt(string userQuery, List<SearchResult> relevantChunks)
    {
        var contextText = string.Join("\n\n---\n", relevantChunks.Select((c, idx) =>
            $"[Source {idx + 1}: Doc {c.Chunk.DocumentId} (Score: {c.SimilarityScore:F3})]\n{c.Chunk.Text}"));

        return $"""
            SYSTEM: You are a helpful enterprise assistant. Answer the user's question using ONLY the retrieved context below. If the context does not contain the answer, reply with 'I cannot find the answer in the provided documents.'

            === RETRIEVED ENTERPRISE CONTEXT ===
            {contextText}

            === USER QUESTION ===
            {userQuery}

            === GROUNDED ANSWER WITH CITATIONS ===
            """;
    }
}
