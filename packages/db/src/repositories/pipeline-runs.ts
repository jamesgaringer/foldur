import type Database from "@tauri-apps/plugin-sql";
import type { PipelineRun, NewPipelineRun, PipelineRunStatus } from "@foldur/core";
import { PipelineRunSchema, generateId, nowISO } from "@foldur/core";

export async function createPipelineRun(
  db: Database,
  run: NewPipelineRun,
): Promise<PipelineRun> {
  const id = generateId();
  const now = nowISO();
  await db.execute(
    `INSERT INTO pipeline_runs
     (id, import_batch_id, stage, status, started_at, completed_at, error_message, metadata_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      run.import_batch_id,
      run.stage,
      run.status,
      run.started_at,
      run.completed_at,
      run.error_message,
      run.metadata_json,
      now,
    ],
  );

  return PipelineRunSchema.parse({ id, ...run, created_at: now });
}

export async function completePipelineRun(
  db: Database,
  id: string,
  status: PipelineRunStatus,
  errorMessage?: string,
): Promise<void> {
  const now = nowISO();
  await db.execute(
    `UPDATE pipeline_runs SET status = $1, completed_at = $2, error_message = $3 WHERE id = $4`,
    [status, now, errorMessage ?? null, id],
  );
}
