-- Tạo extension pgvector (Supabase đã có sẵn)
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable: thêm cột embedding (vector 3072 chiều, Gemini embedding)
-- Lưu ý: không dùng HNSW index vì dim > 2000 (giới hạn HNSW). Với 2442 bài,
-- sequential cosine scan là đủ nhanh (vài chục ms).