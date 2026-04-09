import type Database from "@tauri-apps/plugin-sql";
import {
  cosineSimilarity,
  parseEmbeddingVector,
} from "@foldur/core";

export interface SearchHit {
  chunk_id: string;
  session_id: string;
  message_id: string | null;
  session_title: string | null;
  source_type: string;
  snippet: string;
  rank: number;
}

/** Escape user input for FTS5 MATCH: token AND token, with phrase safety. */
export function ftsMatchQueryFromUserInput(raw: string): string | null {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens
    .map((t) => `"${t.replace(/"/g, '""')}"`)
    .join(" AND ");
}

export interface SearchChunksOptions {
  limit?: number;
  sourceType?: string;
  /** Inclusive lower bound on session date (`YYYY-MM-DD`). Uses `COALESCE(started_at, created_at)`. */
  dateFrom?: string;
  /** Inclusive upper bound on session date (`YYYY-MM-DD`). */
  dateTo?: string;
  /**
   * When set (same dimension as stored chunk embeddings), fetch extra FTS candidates
   * and rerank by blending BM25 spread with cosine similarity.
   */
  queryEmbedding?: number[];
  /** Weight for lexical BM25 vs vector cosine (0 = vector only, 1 = lexical only). Default 0.35. */
  hybridAlpha?: number;
  /** Multiplier on `limit` for FTS candidate pool before rerank. Default 3. */
  candidateMultiplier?: number;
}

type SearchRow = {
  chunk_id: string;
  session_id: string;
  message_id: string | null;
  session_title: string | null;
  source_type: string;
  snippet: string;
  rank: number;
  embedding_vector: string | null;
};

function rowToHit(r: SearchRow): SearchHit {
  return {
    chunk_id: r.chunk_id,
    session_id: r.session_id,
    message_id: r.message_id,
    session_title: r.session_title,
    source_type: r.source_type,
    snippet: r.snippet,
    rank: r.rank,
  };
}

function rerankByHybrid(
  rows: SearchRow[],
  queryEmbedding: number[],
  hybridAlpha: number,
  finalLimit: number,
): SearchHit[] {
  if (rows.length === 0) return [];
  const ranks = rows.map((r) => r.rank);
  const minR = Math.min(...ranks);
  const maxR = Math.max(...ranks);
  const span = maxR - minR || 1;
  const alpha = hybridAlpha;
  const scored = rows.map((r) => {
    const ftsNorm = (maxR - r.rank) / span;
    const emb = parseEmbeddingVector(r.embedding_vector);
    if (
      emb &&
      emb.length === queryEmbedding.length &&
      queryEmbedding.length > 0
    ) {
      const cos = cosineSimilarity(queryEmbedding, emb);
      const cos01 = (cos + 1) / 2;
      const combined = alpha * ftsNorm + (1 - alpha) * cos01;
      return { r, combined };
    }
    return { r, combined: ftsNorm };
  });
  scored.sort((a, b) => b.combined - a.combined);
  return scored.slice(0, finalLimit).map(({ r }) => rowToHit(r));
}

export async function searchChunks(
  db: Database,
  ftsMatch: string,
  options?: SearchChunksOptions,
): Promise<SearchHit[]> {
  const finalLimit = options?.limit ?? 50;
  const sourceType = options?.sourceType;
  const dateFrom = options?.dateFrom?.trim();
  const dateTo = options?.dateTo?.trim();
  const queryEmbedding = options?.queryEmbedding;
  const useHybrid =
    queryEmbedding != null && queryEmbedding.length > 0;

  const fetchLimit = useHybrid
    ? Math.min(
        500,
        (options?.candidateMultiplier ?? 3) * finalLimit,
      )
    : finalLimit;

  const where: string[] = ["chunks_fts MATCH $1"];
  const params: unknown[] = [ftsMatch];
  let i = 2;

  if (sourceType) {
    where.push(`src.type = $${i}`);
    params.push(sourceType);
    i++;
  }
  if (dateFrom) {
    where.push(
      `date(COALESCE(s.started_at, s.created_at)) >= date($${i})`,
    );
    params.push(dateFrom);
    i++;
  }
  if (dateTo) {
    where.push(
      `date(COALESCE(s.started_at, s.created_at)) <= date($${i})`,
    );
    params.push(dateTo);
    i++;
  }

  params.push(fetchLimit);
  const limitPlaceholder = `$${i}`;

  const sql = `SELECT
       c.id AS chunk_id,
       c.session_id,
       c.message_id,
       s.title AS session_title,
       src.type AS source_type,
       substr(c.text, 1, 320) AS snippet,
       bm25(chunks_fts) AS rank,
       c.embedding_vector AS embedding_vector
     FROM chunks_fts
     INNER JOIN chunks c ON c.id = chunks_fts.chunk_id
     INNER JOIN sessions s ON s.id = c.session_id
     INNER JOIN sources src ON src.id = s.source_id
     WHERE ${where.join(" AND ")}
     ORDER BY rank
     LIMIT ${limitPlaceholder}`;

  const rows = await db.select<SearchRow[]>(sql, params);

  if (useHybrid && queryEmbedding) {
    return rerankByHybrid(
      rows,
      queryEmbedding,
      options?.hybridAlpha ?? 0.35,
      finalLimit,
    );
  }

  return rows.slice(0, finalLimit).map(rowToHit);
}
